import { ambientVertex, ambientFragment } from './atmosphere.js';
import { IS_DEVELOPMENT } from './environment.js';
import { rasterizeSculpture, sampleShapePixels } from './particle-shape.js';

// Parámetros artísticos y físicos. El panel se carga exclusivamente en localhost.
export const PARTICLE_CONFIG={
  count:40000,
  mobileCount:14000,
  size:1.7,
  repulsionRadius:100,
  repulsionForce:4.4,
  spring:42,
  damping:8.8,
  breathing:.0045,
  explosionForce:3.0,
  assemblySeconds:2,
  colorA:'#385564',
  colorB:'#52586e',
  brightness:.85,
  beamStrength:1.7,
  maxDpr:2
};

export function particleBudget(width,{coarse=false,memory=8}={},config=PARTICLE_CONFIG){
  const mobile=width<=700||coarse;
  const requested=mobile?config.mobileCount:config.count;
  return Math.round(Math.min(60000,Math.max(mobile?6000:20000,memory<=2?Math.min(requested,10000):requested)));
}

const sceneSource=`
uniform vec4 uPlacement;
uniform float uProgress;
uniform vec3 uPointer;
vec3 homePosition(vec4 home){
 vec3 p=home.xyz;float angle=uProgress*.24,c=cos(angle),s=sin(angle);
 p.xy=mat2(c,-s,s,c)*p.xy;
 p.x+=p.z*uPointer.x*.045;
 p.y+=p.z*uPointer.y*.045;
 return p*uPlacement.z+vec3(uPlacement.xy,0.);
}
float hash(float n){return fract(sin(n*127.1+311.7)*43758.5453);}
`;

const simulationVertex=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aVelocity;
layout(location=2) in vec4 aHome;
uniform float uTime;
uniform float uDt;
uniform float uAssembly;
uniform float uSpring;
uniform float uDamping;
uniform float uBreathing;
uniform float uRadius;
uniform float uRepulsion;
uniform float uAspect;
uniform vec3 uBlast;
out vec3 nextPosition;
out vec3 nextVelocity;
`+sceneSource+`
// Analytic curl of a three-component vector potential. Its divergence is zero;
// no per-particle CPU noise or position updates are involved.
vec3 curlNoise(vec3 p,float time){
 vec3 a=vec3(1.7,2.3,1.1),b=vec3(-1.3,1.9,2.7),c=vec3(2.1,-1.5,1.8);
 float ca=cos(dot(p,a)+time),cb=cos(dot(p,b)-time*.73),cc=cos(dot(p,c)+time*.61);
 return vec3(c.y*cc-b.z*cb,a.z*ca-c.x*cc,b.x*cb-a.y*ca)*.27;
}
void main(){
 float id=float(gl_VertexID),seed=hash(id+1.);
 vec3 home=homePosition(aHome);
 vec3 target=home+curlNoise(aHome.xyz*5.5,uTime*.25)*uBreathing;
 if(uTime<uAssembly){
  vec3 scattered=vec3((hash(id+7.)-.5)*uAspect*2.8,(hash(id+19.)-.5)*2.5,(hash(id+31.)-.5)*1.5);
  float t=clamp(uTime/max(.1,uAssembly-seed*.25),0.,1.);
  float easing=t*t*t*(t*(t*6.-15.)+10.);
  nextPosition=mix(scattered,home,easing);nextVelocity=vec3(0.);
 }else{
  vec3 position=aPosition,velocity=aVelocity;
  vec2 away=position.xy-uPointer.xy;float distance=length(away);
  float influence=1.-smoothstep(0.,uRadius,distance);
  vec3 normal=normalize(vec3(away,(seed-.5)*.035)+vec3(.00001,0.,0.));
  vec3 force=(target-position)*uSpring-velocity*uDamping;
  force+=normal*influence*influence*uRepulsion*uPointer.z;
  if(uBlast.z>0.){
   vec3 radial=position-vec3(uBlast.xy,0.);
   radial.z+=(seed-.5)*.18;
   velocity+=normalize(radial+vec3(.00001,0.,0.))*uBlast.z*(.75+seed*.65)*exp(-length(radial)*.35);
  }
  velocity+=force*uDt;
  velocity*=min(1.,3.5/max(length(velocity),.0001));
  nextPosition=position+velocity*uDt;nextVelocity=velocity;
 }
 gl_Position=vec4(0.);
}`;
const simulationFragment=`#version 300 es
precision highp float;
out vec4 color;
void main(){color=vec4(0.);}`;
const renderVertex=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aVelocity;
layout(location=2) in vec4 aHome;
uniform vec2 uResolution;
uniform float uSize;
uniform float uDpr;
uniform float uStatic;
out float vShade;
out float vTint;
out float vSeed;
out float vActivity;
`+sceneSource+`
void main(){
 float seed=hash(float(gl_VertexID)+1.);
 vec3 p=uStatic>.5?homePosition(aHome):aPosition;
 gl_Position=vec4(p.x*2.*uResolution.y/uResolution.x,p.y*2.,0.,1.);
 float depth=clamp(1.+p.z*1.5,.65,1.6);
 gl_PointSize=max(1.,uSize*uDpr*(.65+seed*.85)*depth);
 float cursor=1.-smoothstep(0.,.18,length(p.xy-uPointer.xy));
 vActivity=clamp(length(aVelocity)*1.4+cursor*uPointer.z*.7,0.,1.);
 vShade=aHome.w;vTint=clamp(aHome.x+.5+seed*.22,0.,1.);vSeed=seed;
}`;
const renderFragment=`#version 300 es
precision highp float;
in float vShade;
in float vTint;
in float vSeed;
in float vActivity;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uGain;
uniform float uHalo;
out vec4 color;
void main(){
 vec2 uv=gl_PointCoord*2.-1.;float radius=dot(uv,uv);if(radius>1.)discard;
 float soft=exp(-radius*(uHalo>.5?3.5:2.4))*(1.-smoothstep(.65,1.,radius));
 vec3 tint=mix(uColorA,uColorB,vTint);
 tint=mix(tint,vec3(.24,.49,.62),pow(vShade,3.)*.34);
 tint=mix(tint,vec3(.38,.84,1.),vActivity*.82);
 float energy=(.20+vShade*.88+vActivity*.65)*uGain;
 color=vec4(tint,soft*energy);
}`;


// The beam is an optical layer, never sampled into the particle geometry.
const beamVertex=`#version 300 es
void main(){
 vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));
 gl_Position=vec4(p*2.-1.,0.,1.);
}`;
const beamFragment=`#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform vec4 uPlacement;
uniform float uDpr;
uniform float uTime;
uniform float uBeamStrength;
out vec4 color;
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*uResolution)/uDpr;
 vec2 center=uPlacement.xy*uResolution.y/uDpr;
 vec2 p=uv-center;
 float extent=uPlacement.z*uResolution.y/uDpr*.46;
 float cap=1.-smoothstep(extent*.84,extent,abs(p.y));
 float distance=abs(p.x);
 float core=exp(-pow(distance/1.35,1.35));
 float inner=exp(-distance/5.5)*.46;
 float bloom=exp(-distance/28.)*.075;
 float fog=exp(-distance/105.)*.015;
 float pulse=exp(-pow((p.y-sin(uTime*.43)*extent*.78)/32.,2.));
 float flare=exp(-abs(p.x)/66.)*exp(-pow(p.y/2.4,2.))*.055;
 vec3 energy=vec3(.50,.82,1.)*(inner+bloom+fog)*(1.+pulse*.8);
 energy+=vec3(.88,.98,1.)*core*(1.4+pulse*.4);
 energy=(energy*cap+vec3(.40,.73,1.)*flare)*uBeamStrength;
 color=vec4(vec3(1.)-exp(-energy),1.);
}`;

const colorChannels=hex=>[1,3,5].map(offset=>parseInt(hex.slice(offset,offset+2),16)/255);

export function createCinemaRenderer(canvas){
 const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,powerPreference:'high-performance'});
 if(!gl)return null;
 const config={...PARTICLE_CONFIG},programs=[],shaders=[];
 const stateBuffers=[],vaos=[],feedbacks=[];
 let homeBuffer=null,count=0,width=0,height=0,dpr=1,read=0,disposed=false,gui=null;
 let startTime=null,lastTime=null,accumulator=0,pendingBlast=null,placement=new Float32Array(4);
 let fpsStart=null,fpsFrames=0,previousReduced=null;
 const coarse=matchMedia('(pointer:coarse)').matches;
 const development=IS_DEVELOPMENT&&['localhost','127.0.0.1','[::1]'].includes(location.hostname);
 const feedbackStep=1/60;
 function makeProgram(vertex,fragment,feedback=false){
  const program=gl.createProgram();programs.push(program);
  for(const [type,source]of[[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
   const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
   if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));gl.attachShader(program,shader);
  }
  if(feedback)gl.transformFeedbackVaryings(program,['nextPosition','nextVelocity'],gl.INTERLEAVED_ATTRIBS);
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  const names=['uPlacement','uProgress','uPointer','uTime','uDt','uAssembly','uSpring','uDamping','uBreathing','uRadius','uRepulsion','uAspect','uBlast','uResolution','uSize','uDpr','uStatic','uColorA','uColorB','uGain','uHalo','uBeamStrength','uLayer','uScroll'];
  return {program,u:Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(program,name)]))};
 }
 function releaseGeometry(){
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.bindVertexArray(null);
  feedbacks.splice(0).forEach(value=>gl.deleteTransformFeedback(value));
  vaos.splice(0).forEach(value=>gl.deleteVertexArray(value));
  stateBuffers.splice(0).forEach(value=>gl.deleteBuffer(value));
  if(homeBuffer){gl.deleteBuffer(homeBuffer);homeBuffer=null;}
 }
 function dispose(){
  if(disposed)return;disposed=true;gui?.destroy();gui=null;releaseGeometry();
  programs.splice(0).forEach(value=>gl.deleteProgram(value));shaders.splice(0).forEach(value=>gl.deleteShader(value));
 }
 try{
  const simulation=makeProgram(simulationVertex,simulationFragment,true),points=makeProgram(renderVertex,renderFragment),beam=makeProgram(beamVertex,beamFragment),ambient=makeProgram(ambientVertex,ambientFragment);
  const api={
   resize(nextWidth,nextHeight,force=false){
    if(disposed||nextWidth<=0||nextHeight<=0)return;
    const nextCount=particleBudget(nextWidth,{coarse,memory:navigator.deviceMemory||8},config);
    const nextDpr=Math.min(devicePixelRatio||1,config.maxDpr,Math.sqrt(2400000/(nextWidth*nextHeight)));
    if(!force&&width===nextWidth&&height===nextHeight&&count===nextCount&&dpr===nextDpr)return;
    width=nextWidth;height=nextHeight;dpr=nextDpr;count=nextCount;
    canvas.width=Math.max(1,Math.round(width*dpr));canvas.height=Math.max(1,Math.round(height*dpr));
    gl.viewport(0,0,canvas.width,canvas.height);releaseGeometry();
    const mobile=width<=700,aspect=width/height;
    placement=new Float32Array([mobile?aspect*.02:aspect*.235,mobile?.18:.055,mobile?aspect*1.12:Math.min(1.03,aspect*.78),0]);
    const image=rasterizeSculpture(Math.round(Math.min(512,Math.max(256,Math.min(width,height)*.65))));
    const homes=sampleShapePixels(image,count);
    homeBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,homeBuffer);gl.bufferData(gl.ARRAY_BUFFER,homes,gl.STATIC_DRAW);
    // Allocate both state buffers once. Every subsequent position/velocity update
    // stays on the GPU; there is no readback or per-particle JS frame loop.
    for(let i=0;i<2;i++){
     const buffer=gl.createBuffer();stateBuffers.push(buffer);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,count*6*4,gl.DYNAMIC_COPY);
     const vao=gl.createVertexArray();vaos.push(vao);gl.bindVertexArray(vao);
     gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
     for(let attribute=0;attribute<2;attribute++){gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,3,gl.FLOAT,false,24,attribute*12);}
     gl.bindBuffer(gl.ARRAY_BUFFER,homeBuffer);gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,4,gl.FLOAT,false,16,0);
     const feedback=gl.createTransformFeedback();feedbacks.push(feedback);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,feedback);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);
    }
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.bindVertexArray(null);gl.bindBuffer(gl.ARRAY_BUFFER,null);
    read=0;startTime=null;lastTime=null;accumulator=0;pendingBlast=null;fpsStart=null;fpsFrames=0;
    canvas.dataset.particleEngine='gpu-transform-feedback';canvas.dataset.particleCount=String(count);canvas.dataset.shapeSampling='offscreen-pixels';canvas.dataset.beamMaterial='continuous-light';canvas.dataset.pixelRatio=dpr.toFixed(2);
   },
   explode(normalizedX,normalizedY){if(!disposed)pendingBlast=[normalizedX*.5*width/height,-normalizedY*.5,config.explosionForce];},
   draw(time,progress,pointer,moving=true,reduced=false){
    if(disposed||gl.isContextLost()||!count)return;
    if(startTime===null)startTime=time;
    if(previousReduced!==null&&previousReduced!==reduced){startTime=time;accumulator=0;}
    previousReduced=reduced;
    const age=time-startTime,dt=lastTime===null?0:Math.max(0,Math.min(1/30,time-lastTime));lastTime=time;
    const px=(pointer.rawX??pointer.x??0)*.5*width/height,py=-(pointer.rawY??pointer.y??0)*.5,active=reduced?0:pointer.rawActive??pointer.active??0;
    function common(target){
     const u=target.u;gl.useProgram(target.program);gl.uniform4fv(u.uPlacement,placement);gl.uniform1f(u.uProgress,progress);gl.uniform3f(u.uPointer,px,py,active);
    }
    if(!reduced&&(moving||age===0)){
     accumulator+=dt;
     let steps=Math.min(2,Math.floor((accumulator+1e-8)/feedbackStep));
     if(age<config.assemblySeconds||!steps&&pendingBlast)steps=Math.max(steps,1);
     common(simulation);const u=simulation.u;
     gl.uniform1f(u.uTime,age);gl.uniform1f(u.uAssembly,config.assemblySeconds);gl.uniform1f(u.uSpring,config.spring);gl.uniform1f(u.uDamping,config.damping);
     gl.uniform1f(u.uBreathing,config.breathing);gl.uniform1f(u.uRadius,config.repulsionRadius/height);gl.uniform1f(u.uRepulsion,config.repulsionForce);gl.uniform1f(u.uAspect,width/height);
     gl.enable(gl.RASTERIZER_DISCARD);
     for(let step=0;step<steps;step++){
      const write=1-read;gl.uniform1f(u.uDt,feedbackStep);gl.uniform3fv(u.uBlast,pendingBlast||[0,0,0]);pendingBlast=null;
      gl.bindVertexArray(vaos[read]);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,feedbacks[write]);
      gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,count);gl.endTransformFeedback();
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);read=write;
     }
     gl.disable(gl.RASTERIZER_DISCARD);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);
     accumulator=Math.max(0,accumulator-steps*feedbackStep);
    }
    gl.clearColor(4/255,8/255,13/255,1);gl.clear(gl.COLOR_BUFFER_BIT);
    common(points);const u=points.u;gl.uniform2f(u.uResolution,canvas.width,canvas.height);gl.uniform1f(u.uDpr,dpr);gl.uniform1f(u.uStatic,reduced?1:0);
    gl.uniform3fv(u.uColorA,colorChannels(config.colorA));gl.uniform3fv(u.uColorB,colorChannels(config.colorB));
    gl.bindVertexArray(vaos[read]);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.disable(gl.DEPTH_TEST);
    common(ambient);gl.uniform2f(ambient.u.uResolution,canvas.width,canvas.height);gl.uniform1f(ambient.u.uDpr,dpr);
    gl.uniform1f(ambient.u.uTime,reduced?0:age);gl.uniform1f(ambient.u.uLayer,0);gl.uniform1f(ambient.u.uScroll,0);
    gl.drawArrays(gl.POINTS,0,reduced?16:width<700?48:100);
    common(points);
    const gain=config.brightness*Math.sqrt(40000/count);
    gl.uniform1f(u.uSize,config.size*3.6);gl.uniform1f(u.uGain,gain*.055);gl.uniform1f(u.uHalo,1);gl.drawArrays(gl.POINTS,0,count);
    gl.uniform1f(u.uSize,config.size);gl.uniform1f(u.uGain,gain);gl.uniform1f(u.uHalo,0);gl.drawArrays(gl.POINTS,0,count);
    common(beam);gl.uniform2f(beam.u.uResolution,canvas.width,canvas.height);gl.uniform1f(beam.u.uDpr,dpr);
    gl.uniform1f(beam.u.uTime,reduced?0:age);gl.uniform1f(beam.u.uBeamStrength,config.beamStrength*(reduced?1:Math.min(1,age/.6)));
    gl.drawArrays(gl.TRIANGLES,0,3);
    gl.disable(gl.BLEND);gl.bindVertexArray(null);
    if(development&&moving){
     if(fpsStart===null)fpsStart=performance.now();fpsFrames++;
     const duration=performance.now()-fpsStart;
     if(duration>1200){canvas.dataset.fps=(fpsFrames*1000/duration).toFixed(1);fpsStart=performance.now();fpsFrames=0;}
    }
    canvas.dataset.particlePhase=reduced?'static':age<config.assemblySeconds?'assembling':'interactive';
   },
   dispose,
   async attachDevelopmentPanel(){
    if(!development||gui||disposed)return;
    const {default:GUI}=await import('../node_modules/lil-gui/dist/lil-gui.esm.js');
    if(disposed)return;
    gui=new GUI({title:'Partículas · desarrollo',width:260});
    Object.assign(gui.domElement.style,{top:'auto',bottom:'15px',right:'15px',zIndex:'10000'});
    gui.add(config,'count',20000,60000,1000).name('Cantidad escritorio').onFinishChange(()=>api.resize(width,height,true));
    gui.add(config,'mobileCount',6000,20000,1000).name('Cantidad móvil').onFinishChange(()=>api.resize(width,height,true));
    gui.add(config,'size',.7,3,.05).name('Tamaño');gui.add(config,'repulsionRadius',30,200,1).name('Radio del mouse');
    gui.add(config,'repulsionForce',.5,8,.1).name('Repulsión');gui.add(config,'spring',15,90,1).name('Resorte');gui.add(config,'damping',5,20,.1).name('Amortiguación');
    gui.add(config,'breathing',0,.02,.0005).name('Respiración');gui.add(config,'explosionForce',.5,4,.1).name('Explosión');
    gui.addColor(config,'colorA').name('Acero');gui.addColor(config,'colorB').name('Sombra');gui.add(config,'beamStrength',.5,3,.05).name('Luz central');gui.add(config,'brightness',.15,1,.01).name('Brillo');
    gui.add({replay:()=>api.resize(width,height,true)},'replay').name('Repetir ensamblado');gui.close();
   }
  };
  return api;
 }catch(error){dispose();console.warn('La apertura muestra su versión estática.',error.message);return null;}
}
