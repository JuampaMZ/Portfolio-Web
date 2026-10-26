import {createAuroraRenderer} from './aurora-renderer.js';
import {createDeviceTilt,tiltOffset} from './particle-orientation.js';
import {PARTICLE_CONFIG as config,layerBudget,galaxySmallBudget} from './particle-config.js';
import {createParticleInput} from './particle-input.js';
import {gpuMath,emptyFragment,rgb,createGpuResources,createGpuState} from './particle-gpu.js';

const galaxySource=`
uniform vec2 uResolution;uniform float uTime,uLayer,uCount,uSmallCount,uSpeed,uScroll,uParallax,uMediumSpeed,uFrontSpeed,uMediumParallax,uFrontParallax;uniform vec2 uGyro;
float sizeClass(float id){return uLayer>.5?2.:(id<uSmallCount?0.:1.);}
float parallaxFactor(float kind){return kind>1.5?uFrontParallax:(kind>.5?uMediumParallax:1.);}
vec3 galacticRoute(float id){
 float aspect=uResolution.x/uResolution.y,seed=random(id+7.),depth=random(id+19.),kind=sizeClass(id);
 float speed=uSpeed*(kind>1.5?uFrontSpeed:(kind>.5?uMediumSpeed:1.));
 vec2 uv;
 if(uLayer>.5){
  float columns=ceil(sqrt(uCount*aspect)),rows=ceil(uCount/columns);
  vec2 cell=vec2(mod(id,columns),floor(id/columns));
  vec2 drift=vec2(sin(uTime*.035*speed+seed*6.28),cos(uTime*.028*speed+seed*9.))*.21;
  uv=(cell+vec2(.32+random(id+31.)*.36,.32+random(id+43.)*.36)+drift)/vec2(columns,rows);
 }else{
  uv=fract(vec2(random(id+11.),random(id+13.))+uTime*speed*vec2((random(id+29.)-.5)*.002,.0008+seed*.0018));
 }
 float parallax=uScroll*uParallax*(.12+depth*.5)*.5*parallaxFactor(kind);
 return vec3(vec2((uv.x-.5)*aspect,uv.y-.5+parallax)+uGyro*(kind>.5&&kind<1.5?1.3:1.),depth);
}
`;
const galaxySimulation=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;layout(location=1) in vec3 aVelocity;
uniform float uDt,uSpring,uDamping,uReset;
out vec3 nextPosition,nextVelocity;
`+gpuMath+galaxySource+`
void main(){
 vec3 base=galacticRoute(float(gl_VertexID));
 vec3 force=-aPosition*uSpring-aVelocity*uDamping+pointerForce(vec3(base.xy+aPosition.xy,0.));
 nextVelocity=aVelocity+force*uDt;
 nextPosition=aPosition+nextVelocity*uDt;
 if(uReset>.5){nextPosition=vec3(0.);nextVelocity=vec3(0.);}
 gl_Position=vec4(0.);
}`;
const galaxyVertex=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;layout(location=1) in vec3 aVelocity;
uniform float uDpr,uSmallOpacity,uMediumOpacity,uFrontOpacity,uTwinkle,uTwinkleSpeed;
uniform vec2 uSmallSize,uMediumSize,uFrontSize;
uniform vec4 uMasks[12];uniform int uMaskCount;
out float vOpacity,vDepth,vNear;
`+gpuMath+galaxySource+`
void main(){
 float id=float(gl_VertexID),seed=random(id+7.);vec3 route=galacticRoute(id);vec2 p=route.xy+aPosition.xy;
 gl_Position=vec4(p.x*2.*uResolution.y/uResolution.x,p.y*2.,0.,1.);
 float edge=(1.-smoothstep(.46,.52,abs(p.y)))*(1.-smoothstep(.46,.52,abs(p.x*uResolution.y/uResolution.x)));
 float kind=sizeClass(id),opacity=kind>1.5?uFrontOpacity:(kind>.5?uMediumOpacity:uSmallOpacity);
 float twinkle=1.-uTwinkle+uTwinkle*(.5+.5*sin(uTime*uTwinkleSpeed*(.3+seed*.7)+seed*41.));
 vOpacity=opacity*twinkle*edge*(.55+route.z*.45);vDepth=route.z;vNear=uLayer;
 if(uLayer>.5){
  // One candidate per text block may cross it, dimmed; the others fade out.
  float columns=ceil(sqrt(uCount*uResolution.x/uResolution.y)),rows=ceil(uCount/columns);
  for(int i=0;i<12;i++){
   if(i>=uMaskCount)break;vec4 r=uMasks[i];
   vec2 d=max(max(r.xy-p,p-r.zw),vec2(0.));
   vec2 center=(r.xy+r.zw)*.5-uGyro;
   float parallax=uScroll*uParallax*.37*.5*uFrontParallax;
   vec2 cell=clamp(floor(vec2(center.x*uResolution.y/uResolution.x+.5,center.y+.5-parallax)*vec2(columns,rows)),vec2(0.),vec2(columns-1.,rows-1.));
   float owner=cell.y*columns+cell.x,allowed=abs(id-owner)<.5?.22:0.;
   vOpacity*=mix(allowed,1.,smoothstep(0.,.035,length(d)));
  }
 }
 vec2 range=kind>1.5?uFrontSize:(kind>.5?uMediumSize:uSmallSize);
 gl_PointSize=max(1.,uDpr*mix(range.x,range.y,random(id+53.)*.72+route.z*.28));
}`;
const galaxyFragment=`#version 300 es
precision mediump float;
in float vOpacity,vDepth,vNear;uniform vec3 uColor;uniform float uBrightness;out vec4 color;
void main(){
 vec2 p=gl_PointCoord*2.-1.;float r=dot(p,p);if(r>1.)discard;
 float glow=exp(-r*(vNear>.5?2.5:4.))*(1.-smoothstep(.65,1.,r));
 color=vec4(mix(uColor,vec3(.82,.93,1.),vDepth*.28)*uBrightness,glow*vOpacity);
}`;

export function createGalaxyRenderer(canvas,front=false){
 const gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,powerPreference:'low-power'});if(!gl)return null;
 const resources=createGpuResources(gl);let state=null,width=0,height=0,count=0,dpr=1,lastTime=null,accumulator=0,reset=true,disposed=false;
 const names=['uResolution','uTime','uLayer','uCount','uSpeed','uSmallCount','uMediumSpeed','uFrontSpeed','uMediumParallax','uFrontParallax','uScroll','uParallax','uDt','uSpring','uDamping','uReset','uTrail[0]','uRadius','uRepulsion','uDpr','uSmallSize','uMediumSize','uFrontSize','uSmallOpacity','uMediumOpacity','uFrontOpacity','uBrightness','uTwinkle','uTwinkleSpeed','uGyro','uColor','uMasks[0]','uMaskCount'];
 function dispose(){if(disposed)return;disposed=true;state?.dispose();resources.dispose();}
 try{
  const simulation=resources.program(galaxySimulation,emptyFragment,names,true),points=resources.program(galaxyVertex,galaxyFragment,names);
  const api={
   resize(force=false){
    const w=innerWidth,h=innerHeight,budget=layerBudget(w,front,{coarse:matchMedia('(pointer:coarse)').matches}),ratio=Math.min(devicePixelRatio||1,config.maxDpr,1.25);
    if(!force&&width===w&&height===h&&budget===count&&ratio===dpr)return;
    width=w;height=h;count=budget;dpr=ratio;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);gl.viewport(0,0,canvas.width,canvas.height);
    state?.dispose();state=createGpuState(gl,count);reset=true;lastTime=null;accumulator=0;canvas.dataset.ambientCount=String(count);
   },
   draw(time,trail,masks=new Float32Array(48),maskCount=0,tilt=[0,0]){
    if(disposed||gl.isContextLost()||!state)return;
    const dt=lastTime===null?0:Math.max(0,Math.min(1/30,time-lastTime));lastTime=time;accumulator+=dt;
    function common(target){
     gl.useProgram(target.program);const u=target.u;
     gl.uniform2f(u.uResolution,canvas.width,canvas.height);gl.uniform1f(u.uTime,time);gl.uniform1f(u.uLayer,front?1:0);gl.uniform1f(u.uCount,count);
     gl.uniform1f(u.uSpeed,config.galaxySpeed);gl.uniform1f(u.uSmallCount,galaxySmallBudget(width,{coarse:matchMedia('(pointer:coarse)').matches}));
     gl.uniform1f(u.uMediumSpeed,config.mediumSpeed);gl.uniform1f(u.uFrontSpeed,config.frontSpeed);gl.uniform1f(u.uMediumParallax,config.mediumParallax);gl.uniform1f(u.uFrontParallax,config.frontParallax);gl.uniform1f(u.uScroll,scrollY/height);gl.uniform1f(u.uParallax,config.parallax);gl.uniform2fv(u.uGyro,tiltOffset(tilt,front?config.gyroFrontPixels:config.gyroBackPixels,height));
     gl.uniform4fv(u['uTrail[0]'],trail);gl.uniform1f(u.uRadius,config.repulsionRadius/height);gl.uniform1f(u.uRepulsion,config.galaxyRepulsion);
    }
    common(simulation);gl.uniform1f(simulation.u.uDt,1/60);gl.uniform1f(simulation.u.uSpring,config.galaxySpring);gl.uniform1f(simulation.u.uDamping,config.galaxyDamping);
    let steps=Math.min(2,Math.floor((accumulator+1e-8)*60));if(reset)steps=Math.max(steps,1);
    for(let i=0;i<steps;i++){gl.uniform1f(simulation.u.uReset,reset?1:0);state.step();reset=false;}accumulator=Math.max(0,accumulator-steps/60);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);common(points);const u=points.u;
    gl.uniform1f(u.uDpr,dpr);gl.uniform1f(u.uBrightness,config.galaxyBrightness);
    for(const [prefix,name]of[['small','Small'],['medium','Medium'],['front','Front']]){gl.uniform2f(u['u'+name+'Size'],config[prefix+'SizeMin'],config[prefix+'SizeMax']);gl.uniform1f(u['u'+name+'Opacity'],config[prefix+'Opacity']);}gl.uniform1f(u.uTwinkle,config.twinkle);gl.uniform1f(u.uTwinkleSpeed,config.twinkleSpeed);
    gl.uniform3fv(u.uColor,rgb(front?config.frontColor:config.backColor));gl.uniform4fv(u['uMasks[0]'],masks);gl.uniform1i(u.uMaskCount,front?maskCount:0);
    state.bind();gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.drawArrays(gl.POINTS,0,count);gl.disable(gl.BLEND);gl.bindVertexArray(null);
    canvas.dataset.animationTime=time.toFixed(2);
   },dispose
  };return api;
 }catch(error){dispose();console.warn('La galaxia conserva su fondo atmosférico.',error.message);return null;}
}

export function initAtmosphere(sharedInput=null,sharedOrientation=null){
 const controller=new AbortController(),input=sharedInput||createParticleInput(),orientation=sharedOrientation||createDeviceTilt();
 const on=(target,event,callback,options={})=>target.addEventListener(event,callback,{passive:true,...options,signal:controller.signal});
 const back=document.createElement('canvas'),front=document.createElement('canvas'),nebula=document.createElement('canvas');
 back.className='ambient-layer ambient-layer--back';front.className='ambient-layer ambient-layer--front';nebula.className='aurora-layer';
 for(const element of [back,front,nebula])element.setAttribute('aria-hidden','true');document.body.prepend(nebula,back);document.body.append(front);
 let layers=[createGalaxyRenderer(back),createGalaxyRenderer(front,true)],raf=0,previous=0,time=0,disposed=false,lastMasks=-1000,scrollFlow=scrollY/innerHeight,aurora=createAuroraRenderer(nebula);
 const masks=new Float32Array(48);let maskCount=0;
 function updateMasks(now){
  if(now-lastMasks<180)return;lastMasks=now;maskCount=0;masks.fill(0);
  const candidates=document.querySelectorAll('h1,h2,.cinema-description,.about-copy>p,.contact-lead');
  for(const element of candidates){
   if(maskCount>=12)break;if(element.closest('[aria-hidden="true"]'))continue;
   const r=element.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight||r.width===0||r.height===0)continue;
   masks.set([(r.left-12-innerWidth*.5)/innerHeight,(innerHeight*.5-r.bottom-12)/innerHeight,(r.right+12-innerWidth*.5)/innerHeight,(innerHeight*.5-r.top+12)/innerHeight],maskCount++*4);
  }
 }
 function request(){if(!disposed&&!document.hidden&&!raf)raf=requestAnimationFrame(draw);}
 function draw(now){
  raf=0;if(disposed||document.hidden)return;const dt=previous?Math.min((now-previous)/1000,.05):0;time+=dt;previous=now;
  updateMasks(now);const trail=input.sample(innerWidth,innerHeight),tilt=orientation.sample();
  scrollFlow+=(scrollY/innerHeight-scrollFlow)*(1-Math.exp(-dt*2.4));
  aurora?.draw(time,scrollFlow,trail,masks,maskCount,tilt);layers[0]?.draw(time,trail,masks,0,tilt);layers[1]?.draw(time,trail,masks,maskCount,tilt);
    request();
 }
 function resize(force=false){layers.forEach(layer=>layer?.resize(force));aurora?.resize(force);lastMasks=-1000;request();}
 function dispose(){
  if(disposed)return;disposed=true;controller.abort();if(raf)cancelAnimationFrame(raf);layers.forEach(layer=>layer?.dispose());layers=[];aurora?.dispose();back.remove();front.remove();nebula.remove();if(!sharedInput)input.dispose();if(!sharedOrientation)orientation.dispose();
 }
 on(window,'resize',()=>resize());on(window,'particle-config-change',()=>resize(true));
 on(document,'visibilitychange',()=>{previous=0;if(document.hidden&&raf){cancelAnimationFrame(raf);raf=0;}else request();});
 for(const [index,canvas]of[back,front].entries()){
  on(canvas,'webglcontextlost',event=>{event.preventDefault();layers[index]?.dispose();layers[index]=null;},{passive:false});
  on(canvas,'webglcontextrestored',()=>{layers[index]=createGalaxyRenderer(canvas,index===1);resize();});
 }
 on(nebula,'webglcontextlost',event=>{event.preventDefault();aurora?.dispose();aurora=null;},{passive:false});
 on(nebula,'webglcontextrestored',()=>{aurora=createAuroraRenderer(nebula);resize();});
 resize();return {dispose};
}
