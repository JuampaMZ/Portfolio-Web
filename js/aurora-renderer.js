import {PARTICLE_CONFIG as config} from './particle-config.js';
import {fullscreenVertex,rgb,createGpuResources} from './particle-gpu.js';
const fragment=`#version 300 es
precision highp float;
uniform vec2 uResolution,uPointerPan;
uniform float uTime,uScroll,uIntensity,uSpeed,uNoiseScale,uScrollAmount,uPointer;
uniform int uCurtains,uMaskCount;
uniform vec3 uColorA,uColorB,uColorC,uColorD;
uniform vec4 uTrail[8],uMasks[12];out vec4 color;
float hash21(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1.,0.)),f.x),mix(hash21(i+vec2(0.,1.)),hash21(i+vec2(1.)),f.x),f.y);}
float fbm(vec2 p){float sum=0.,amplitude=.5;for(int i=0;i<4;i++){sum+=noise(p)*amplitude;p=mat2(.8,-.6,.6,.8)*p*2.03+vec2(4.1,1.7);amplitude*=.5;}return sum;}
void main(){
 vec2 screen=(gl_FragCoord.xy-.5*uResolution)/uResolution.y;
 float clock=uTime*uSpeed,flow=uScroll*uScrollAmount;
 vec2 p=screen-uPointerPan;float rotation=sin(flow*.42+clock*.09)*.62;
 p=mat2(cos(rotation),-sin(rotation),sin(rotation),cos(rotation))*p;
 p.y+=sin(flow*.55)*.22;p.x+=cos(flow*.23)*.14;
 for(int i=0;i<8;i++){
  if(uTrail[i].z<.004)continue;
  vec2 delta=screen-uTrail[i].xy;float distance=length(delta);if(distance>.5)continue;
  p.y+=sin(distance*24.-clock*1.4)*exp(-distance*9.)*uTrail[i].z*uPointer*.018*(1.-smoothstep(.35,.5,distance));
 }
 float n=fbm(p*uNoiseScale+vec2(clock*.24,flow*.19-clock*.12));
 vec3 light=vec3(0.);float density=0.;
 for(int i=0;i<4;i++){
  if(i>=uCurtains)break;float lane=float(i);
  float curve=sin(p.x*(2.2+lane*.3)+n*3.+clock*.38+lane*1.7)*(.12+lane*.014)+(lane-float(uCurtains-1)*.5)*.19;
  float d=p.y-curve,width=.025+n*.025;
  float ribbon=exp(-abs(d)/width)*.5;
  float veil=(1.-smoothstep(-.015,.06,d))*exp(-max(-d,0.)*7.5)*.28;
  float rays=.65+.35*pow(.5+.5*sin(p.x*105.+n*8.+lane),2.);
  float intensity=(ribbon+veil)*rays*(.68+.32*sin(clock*.17+lane+flow*.2));
  float palette=.5+.5*sin(flow*.48+lane*.55+clock*.07);
  vec3 a=mix(uColorA,uColorB,.5+.5*sin(p.x+lane));vec3 b=mix(uColorC,uColorD,.5+.5*cos(p.x*.7-lane));
  light+=mix(a,b,palette)*intensity;density+=intensity;
 }
 float protection=1.;
 for(int i=0;i<12;i++){
  if(i>=uMaskCount)break;vec4 r=uMasks[i];vec2 delta=max(max(r.xy-screen,screen-r.zw),vec2(0.));
  protection*=mix(.30,1.,smoothstep(0.,.045,length(delta)));
 }
 float alpha=clamp(density*uIntensity,0.,.24)*protection;
 vec3 tint=light/max(density,.0001);
 color=vec4(tint,alpha);
}`;
// The aurora shares the back-star context, but its expensive shader stays quarter resolution.
export function createAuroraRenderer(canvas,{shared=false}={}){
 const gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,powerPreference:'low-power'});if(!gl)return null;
 const resources=createGpuResources(gl);let vao=null,texture=null,frame=null,disposed=false,width=0,height=0,ratio=0,targetWidth=1,targetHeight=1;
 const names=['uResolution','uPointerPan','uTime','uScroll','uIntensity','uSpeed','uNoiseScale','uScrollAmount','uPointer','uCurtains','uMaskCount','uColorA','uColorB','uColorC','uColorD','uTrail[0]','uMasks[0]'];
 function dispose(){if(disposed)return;disposed=true;if(vao)gl.deleteVertexArray(vao);if(texture)gl.deleteTexture(texture);if(frame)gl.deleteFramebuffer(frame);resources.dispose();}
 try{
  const target=resources.program(fullscreenVertex,fragment,names);vao=gl.createVertexArray();
  const composite=shared?resources.program(fullscreenVertex,`#version 300 es
precision mediump float;uniform sampler2D uAurora;uniform vec2 uOutputSize;out vec4 color;void main(){color=texture(uAurora,gl_FragCoord.xy/uOutputSize);}`, ['uAurora','uOutputSize']):null;
  if(shared){texture=gl.createTexture();frame=gl.createFramebuffer();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.bindTexture(gl.TEXTURE_2D,null);}
  return {
   resize(force=false){
    const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight),mobile=w<=700||matchMedia('(pointer:coarse)').matches,next=Math.min(.6,Math.max(.15,mobile?config.auroraMobileResolution:config.auroraResolution));
    if(!force&&w===width&&h===height&&ratio===next)return;if(w<=0||h<=0)return;
    width=w;height=h;ratio=next;targetWidth=Math.max(1,Math.round(w*ratio));targetHeight=Math.max(1,Math.round(h*ratio));
    if(shared){gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,targetWidth,targetHeight,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.bindFramebuffer(gl.FRAMEBUFFER,frame);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);const ok=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.bindTexture(gl.TEXTURE_2D,null);if(!ok)throw Error('Framebuffer de aurora no disponible.');}
    else{canvas.width=targetWidth;canvas.height=targetHeight;}canvas.dataset.resolutionScale=ratio.toFixed(2);canvas.dataset.auroraShared=String(shared);
   },
   draw(time,scroll,trail,masks=new Float32Array(48),maskCount=0){
    if(disposed||gl.isContextLost())return;
    gl.bindFramebuffer(gl.FRAMEBUFFER,shared?frame:null);gl.viewport(0,0,targetWidth,targetHeight);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(target.program);const u=target.u;
    gl.uniform2f(u.uResolution,targetWidth,targetHeight);gl.uniform2f(u.uPointerPan,trail[2]>0?trail[0]*.004:0,trail[2]>0?trail[1]*.004:0);
    for(const [name,value]of Object.entries({uTime:time,uScroll:scroll,uIntensity:config.auroraIntensity,uSpeed:config.auroraSpeed,uNoiseScale:config.auroraNoiseScale,uScrollAmount:config.auroraScroll,uPointer:config.auroraPointer}))gl.uniform1f(u[name],value);
    gl.uniform1i(u.uCurtains,Math.max(1,Math.min(4,Math.round(config.auroraCurtains))));gl.uniform1i(u.uMaskCount,maskCount);
    for(const key of ['A','B','C','D'])gl.uniform3fv(u['uColor'+key],rgb(config['auroraColor'+key]));
    gl.uniform4fv(u['uTrail[0]'],trail);gl.uniform4fv(u['uMasks[0]'],masks);
    gl.bindVertexArray(vao);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.drawArrays(gl.TRIANGLES,0,3);gl.disable(gl.BLEND);
    if(shared){gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);gl.useProgram(composite.program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(composite.u.uAurora,0);gl.uniform2f(composite.u.uOutputSize,canvas.width,canvas.height);gl.drawArrays(gl.TRIANGLES,0,3);gl.bindTexture(gl.TEXTURE_2D,null);}
    gl.bindVertexArray(null);canvas.dataset.auroraTime=time.toFixed(2);canvas.dataset.scrollFlow=scroll.toFixed(3);
   },dispose
  };
 }catch(error){dispose();console.warn('La aurora conserva el fondo galáctico.',error.message);return null;}
}
