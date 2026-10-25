export const ATMOSPHERE_CONFIG={backCount:150,frontCount:44,mobileBackCount:54,mobileFrontCount:16};

export const ambientVertex=`#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uDpr;
uniform float uLayer;
uniform float uScroll;
uniform vec3 uPointer;
out float vOpacity;
out float vSeed;
out float vDefocus;
float random(float n){return fract(sin(n*127.1+311.7)*43758.5453);}
void main(){
 float id=float(gl_VertexID)+1.,seed=random(id),depth=random(id+11.);
 vec2 origin=vec2(random(id+3.),random(id+7.));
 vec2 velocity=vec2((random(id+13.)-.5)*.008,.003+random(id+17.)*.008);
 vec2 uv=fract(origin+uTime*velocity+vec2(0.,uScroll*(.3+uLayer)*.000012));
 uv+=vec2(sin(uTime*.08+seed*6.28)*.009,cos(uTime*.06+seed*9.)*.006);
 float aspect=uResolution.x/uResolution.y;
 vec2 p=vec2((uv.x-.5)*aspect,uv.y-.5);
 vec2 away=p-uPointer.xy;float distance=length(away);
 float influence=pow(1.-smoothstep(0.,.15,distance),2.)*uPointer.z;
 p+=normalize(away+vec2(.00001,0.))*influence*.035*(.4+uLayer);
 gl_Position=vec4(p.x*2./aspect,p.y*2.,0.,1.);
 vDefocus=uLayer>.5&&depth>.86?1.:0.;
 gl_PointSize=uDpr*mix(.8,2.,depth)*(uLayer>.5?1.5:1.)*(vDefocus>.5?2.4:1.);
 vOpacity=(uLayer>.5?.25+depth*.40:.18+depth*.22)*(vDefocus>.5?.38:1.);
 vSeed=seed;
}`;
export const ambientFragment=`#version 300 es
precision mediump float;
in float vOpacity;
in float vSeed;
in float vDefocus;
out vec4 color;
void main(){
 vec2 uv=gl_PointCoord*2.-1.;float radius=dot(uv,uv);if(radius>1.)discard;
 float glow=exp(-radius*(vDefocus>.5?2.8:4.))*(1.-smoothstep(.65,1.,radius));
 vec3 tint=mix(vec3(.50,.67,.76),vec3(.72,.94,1.),step(.84,vSeed));
 color=vec4(tint,glow*vOpacity);
}`;

function createLayer(canvas,near){
 const gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,powerPreference:'low-power'});
 if(!gl)return null;
 const program=gl.createProgram(),shaders=[];let vao=null,disposed=false,width=1,height=1,dpr=1,count=0;
 function dispose(){if(disposed)return;disposed=true;if(vao)gl.deleteVertexArray(vao);gl.deleteProgram(program);shaders.forEach(shader=>gl.deleteShader(shader));}
 try{
  for(const [type,code]of[[gl.VERTEX_SHADER,ambientVertex],[gl.FRAGMENT_SHADER,ambientFragment]]){
   const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,code);gl.compileShader(shader);
   if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));gl.attachShader(program,shader);
  }
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  vao=gl.createVertexArray();
  const u=Object.fromEntries(['uResolution','uTime','uDpr','uLayer','uScroll','uPointer'].map(name=>[name,gl.getUniformLocation(program,name)]));
  return {
   resize(){
    width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,1.5);
    count=width<700?(near?ATMOSPHERE_CONFIG.mobileFrontCount:ATMOSPHERE_CONFIG.mobileBackCount):(near?ATMOSPHERE_CONFIG.frontCount:ATMOSPHERE_CONFIG.backCount);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);gl.viewport(0,0,canvas.width,canvas.height);canvas.dataset.ambientCount=String(count);
   },
   draw(time,pointer,reduced){
    if(disposed||gl.isContextLost())return;
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(program);gl.bindVertexArray(vao);
    gl.uniform2f(u.uResolution,canvas.width,canvas.height);gl.uniform1f(u.uTime,reduced?0:time);gl.uniform1f(u.uDpr,dpr);gl.uniform1f(u.uLayer,near?1:0);gl.uniform1f(u.uScroll,reduced?0:scrollY);
    gl.uniform3f(u.uPointer,pointer.x*width/height,-pointer.y,reduced?0:pointer.active);
    gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.drawArrays(gl.POINTS,0,reduced?Math.min(count,18):count);gl.disable(gl.BLEND);gl.bindVertexArray(null);
   },dispose
  };
 }catch(error){dispose();console.warn('La atmósfera decorativa usa su fondo estático.',error.message);return null;}
}

export function initAtmosphere(){
 const controller=new AbortController(),preference=matchMedia('(prefers-reduced-motion:reduce)');
 const on=(target,event,callback,options={})=>target.addEventListener(event,callback,{...options,signal:controller.signal});
 const back=document.createElement('canvas'),front=document.createElement('canvas');
 back.className='ambient-layer ambient-layer--back';front.className='ambient-layer ambient-layer--front';
 for(const canvas of [back,front]){canvas.setAttribute('aria-hidden','true');canvas.setAttribute('role','presentation');}
 document.body.prepend(back);document.body.append(front);
 let layers=[createLayer(back,false),createLayer(front,true)],raf=0,previous=0,time=0,paused=false,disposed=false;
 const pointer={x:0,y:0,active:0};
 function request(){if(!disposed&&!document.hidden&&!raf)raf=requestAnimationFrame(draw);}
 function draw(now){
  raf=0;if(disposed)return;
  const elapsed=previous?Math.min((now-previous)/1000,.05):0;previous=now;
  if(!paused&&!preference.matches)time+=elapsed;
  layers.forEach(layer=>layer?.draw(time,pointer,preference.matches));
  if(!paused&&!preference.matches&&layers.some(Boolean))request();
 }
 function resize(){layers.forEach(layer=>layer?.resize());previous=0;request();}
 function dispose(){
  if(disposed)return;disposed=true;controller.abort();if(raf)cancelAnimationFrame(raf);raf=0;
  layers.forEach(layer=>layer?.dispose());layers=[];back.remove();front.remove();
 }
 on(window,'pointermove',event=>{if(event.pointerType==='mouse'){pointer.x=event.clientX/innerWidth-.5;pointer.y=event.clientY/innerHeight-.5;pointer.active=1;}},{passive:true});
 on(document,'pointerleave',()=>{pointer.active=0;});on(window,'blur',()=>{pointer.active=0;});
 on(window,'resize',resize,{passive:true});on(window,'scroll',request,{passive:true});
 on(document,'visibilitychange',()=>{previous=0;if(document.hidden&&raf){cancelAnimationFrame(raf);raf=0;}else request();});
 on(preference,'change',()=>{previous=0;request();});
 for(const [index,canvas]of[back,front].entries()){
  on(canvas,'webglcontextlost',event=>{event.preventDefault();layers[index]?.dispose();layers[index]=null;});
  on(canvas,'webglcontextrestored',()=>{layers[index]=createLayer(canvas,index===1);resize();});
 }
 resize();
 return {dispose,setPaused(value){paused=value;previous=0;if(raf)cancelAnimationFrame(raf);raf=0;request();}};
}
