import {beamPose,bandBasis,beamEndpoints} from './particle-motion.js';
import {tiltOffset} from './particle-orientation.js';
import {IS_DEVELOPMENT} from './environment.js';
import {PARTICLE_CONFIG as config,particleBudget,introState} from './particle-config.js';
import {gpuMath,fullscreenVertex,emptyFragment,rgb,createGpuResources,createGpuState} from './particle-gpu.js';
export {PARTICLE_CONFIG,particleBudget} from './particle-config.js';

const orbitalSource=`
uniform vec4 uPlacement;uniform vec3 uCenter;uniform mat3 uBandBasis;
uniform float uOrbitSpeed,uCloudSpeed,uPrecession,uBandRadius,uBandThickness,uBandHeight,uBandDensity,uBandShear,uTurbulence,uTurbulenceSpeed,uCycle,uInfall,uEjection;
vec2 bandTube(float id){
 float radius=min(1.12,sqrt(-2.*log(max(random(id+15.),.00001)))*.36),angle=random(id+18.)*6.2831853;
 return vec2(cos(angle),sin(angle))*radius;
}
vec3 orbitalTarget(float id,float time){
 bool band=random(id+91.)<uBandDensity;vec2 tube=bandTube(id);
 float radius=max(.08,uBandRadius+tube.x*uBandThickness);
 float speed=band?uOrbitSpeed*pow(uBandRadius/radius,uBandShear):uCloudSpeed;
 float angle=random(id+4.)*6.2831853+time*(speed+uPrecession*.15)*(.96+random(id+8.)*.08);
 float phase=fract((time+random(id+31.)*uCycle)/(uCycle*(.75+random(id+12.)*.7)));
 if(random(id+27.)>.88){
  float inward=smoothstep(.06,.15,phase)*(1.-smoothstep(.22,.35,phase));radius*=1.-inward*uInfall;
  angle+=smoothstep(.06,.23,phase)*12.5663706;
  float flight=max(0.,sin(clamp((phase-.51)/.23,0.,1.)*3.14159265));radius*=1.+flight*uEjection;angle+=flight*.75;
 }
 vec3 p;
 if(band){
  p=vec3(cos(angle)*radius,tube.y*uBandHeight,sin(angle)*radius);
  p+=curlNoise(p*8.,time*uTurbulenceSpeed*.52)*uTurbulence*.12;
 }else{
  float z=random(id+43.)*2.-1.,r=(.10+.25*pow(random(id+47.),.65))*radius/uBandRadius;
  p=vec3(cos(angle)*sqrt(1.-z*z),z*.85,sin(angle)*sqrt(1.-z*z))*r;
  p+=curlNoise(p*7.+random(id+8.),time*uTurbulenceSpeed)*uTurbulence;
 }
 return uBandBasis*p*uPlacement.z+uCenter;
}
vec3 nucleusPointer(vec3 p){float perspective=1./max(.55,1.-p.z*.38);vec3 force=pointerForce(vec3(p.xy*perspective,p.z));force.xy/=perspective;return force;}
`;
const simulationVertex=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;layout(location=1) in vec3 aVelocity;
uniform float uTime,uDt,uReset,uSpring,uDamping,uAssemblyDelay,uAssemblySeconds,uAspect;
out vec3 nextPosition,nextVelocity;
`+gpuMath+orbitalSource+`
void main(){
 float id=float(gl_VertexID),seed=random(id+1.);
 vec3 target=orbitalTarget(id,uTime);
 float start=uAssemblyDelay+seed*.45,finish=uAssemblyDelay+uAssemblySeconds;
 if(uTime<finish){
  vec3 dispersed=vec3((random(id+51.)-.5)*uAspect*2.4,(random(id+62.)-.5)*2.2,(random(id+71.)-.5)*1.2);
  float t=clamp((uTime-start)/max(.1,finish-start),0.,1.);float ease=t*t*t*(t*(t*6.-15.)+10.);
  float spiral=(1.-ease)*sin(t*3.14159265)*2.;
  dispersed.xy=mat2(cos(spiral),-sin(spiral),sin(spiral),cos(spiral))*dispersed.xy;
  nextPosition=mix(dispersed,target,ease);nextVelocity=vec3(0.);
 }else if(uReset>.5){nextPosition=target;nextVelocity=vec3(0.);}
 else{
  vec3 force=(target-aPosition)*uSpring+-aVelocity*uDamping+nucleusPointer(aPosition);
  nextVelocity=aVelocity+force*uDt;nextVelocity*=min(1.,4./max(length(nextVelocity),.0001));
  nextPosition=aPosition+nextVelocity*uDt;
 }
 gl_Position=vec4(0.);
}`;
const pointVertex=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;layout(location=1) in vec3 aVelocity;
uniform vec2 uResolution;uniform float uSize,uDpr,uTime;
out float vEnergy,vTint,vActivity;
`+gpuMath+orbitalSource+`
void main(){
 float id=float(gl_VertexID),seed=random(id+1.);vec3 p=aPosition;float perspective=1./max(.55,1.-p.z*.38);
 gl_Position=vec4(p.x*perspective*2.*uResolution.y/uResolution.x,p.y*perspective*2.,0.,1.);
 gl_PointSize=max(1.,uSize*uDpr*(.6+seed*.8)*clamp(perspective,.7,1.5));
 vec2 tube=bandTube(id);bool band=random(id+91.)<uBandDensity;
 float density=exp(-dot(tube,tube)*2.2),edge=1.-smoothstep(.65,1.15,length(tube));
 vEnergy=band?(.40+density*1.2)*edge:.27;
 vTint=clamp(.45+p.z*.7,0.,1.);vActivity=clamp(length(nucleusPointer(p))*.5,0.,1.);
}`;
const pointFragment=`#version 300 es
precision highp float;
in float vEnergy,vTint,vActivity;
uniform vec3 uColorA,uColorB,uActiveColor;uniform float uGain,uHalo;
out vec4 color;
void main(){
 vec2 uv=gl_PointCoord*2.-1.;float r=dot(uv,uv);if(r>1.)discard;
 // Combine the soft halo and sharp center in one point pass.
 float halo=exp(-r*3.5)*(1.-smoothstep(.65,1.,r));
 float coreRadius=r*12.96,core=exp(-coreRadius*2.7)*(1.-smoothstep(.65,1.,coreRadius));
 float soft=core+halo*.055;
 vec3 tint=mix(uColorA,uColorB,vTint);tint=mix(tint,uActiveColor,vActivity*.86);
 color=vec4(tint,soft*(vEnergy+vActivity*.8)*uGain);
}`;
const beamFragment=`#version 300 es
precision highp float;
uniform vec2 uResolution;uniform vec4 uBeamEnds;uniform float uDpr,uTime,uBeamStrength,uBeamGrowth,uPulseSpeed;uniform vec3 uBeamColor;
out vec4 color;
void main(){
 vec2 screen=(gl_FragCoord.xy-.5*uResolution)/uResolution.y;
 vec2 segment=uBeamEnds.zw-uBeamEnds.xy;float len=max(.0001,length(segment));
 vec2 direction=segment/len;float t=dot(screen-uBeamEnds.xy,direction);
 float along=(t-len*.5)*uResolution.y/uDpr;
 float distance=length(screen-(uBeamEnds.xy+direction*clamp(t,0.,len)))*uResolution.y/uDpr;
 if(distance>110.){color=vec4(0.);return;}
 float extent=len*.5*uResolution.y/uDpr,cap=1.-smoothstep(extent*.84,extent,abs(along));
 float core=exp(-pow(distance/1.35,1.35)),inner=exp(-distance/5.5)*.46,bloom=exp(-distance/28.)*.075;
 float pulse=exp(-pow((along-sin(uTime*uPulseSpeed)*extent*.78)/32.,2.));
 float flare=exp(-distance/66.)*exp(-pow(along/2.4,2.))*.055;
 vec3 energy=uBeamColor*(inner+bloom)*(1.+pulse*.55)+mix(uBeamColor,vec3(1.),.7)*core*(1.4+pulse*.25);
 vec3 light=vec3(1.)-exp(-(energy*cap+uBeamColor*.8*flare)*uBeamStrength*uBeamGrowth);
 float alpha=max(light.r,max(light.g,light.b));color=vec4(light/max(alpha,.0001),alpha);
}`;

export function createCinemaRenderer(canvas){
 const gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,powerPreference:'high-performance'});if(!gl)return null;
 const resources=createGpuResources(gl);let state=null,disposed=false,width=0,height=0,dpr=1,count=0,reset=true,gui=null;
 let startTime=null,lastTime=null,accumulator=0,fpsStart=null,fpsFrames=0;
 let placement=new Float32Array(4),basis=new Float32Array(9),center=new Float32Array(3);const emptyTrail=new Float32Array(32);
 const development=IS_DEVELOPMENT&&['localhost','127.0.0.1','[::1]'].includes(location.hostname);
 const names=['uResolution','uPlacement','uCenter','uBandBasis','uBandRadius','uBandThickness','uBandHeight','uBandDensity','uBandShear','uBeamEnds','uPulseSpeed','uOrbitSpeed','uCloudSpeed','uPrecession','uTurbulenceSpeed','uTurbulence','uCycle','uInfall','uEjection','uTime','uDt','uReset','uSpring','uDamping','uAssemblyDelay','uAssemblySeconds','uAspect','uTrail[0]','uRadius','uRepulsion','uSize','uDpr','uColorA','uColorB','uActiveColor','uGain','uHalo','uBeamStrength','uBeamGrowth','uBeamColor'];
 function dispose(){if(disposed)return;disposed=true;gui?.destroy();state?.dispose();resources.dispose();}
 try{
  const simulation=resources.program(simulationVertex,emptyFragment,names,true),points=resources.program(pointVertex,pointFragment,names),beam=resources.program(fullscreenVertex,beamFragment,names);
  function uniforms(target,age,trail){
   gl.useProgram(target.program);const u=target.u;
   gl.uniform2f(u.uResolution,canvas.width,canvas.height);gl.uniform4fv(u.uPlacement,placement);gl.uniform3fv(u.uCenter,center);gl.uniformMatrix3fv(u.uBandBasis,false,basis);gl.uniform1f(u.uBandDensity,config.bandDensity);gl.uniform1f(u.uTime,age);gl.uniform1f(u.uDpr,dpr);
   gl.uniform4fv(u['uTrail[0]'],trail);gl.uniform1f(u.uRadius,config.repulsionRadius/height);gl.uniform1f(u.uRepulsion,config.repulsionForce);
  }
  const api={
   resize(w,h,force=false){
    if(disposed||w<=0||h<=0)return;
    const budget=particleBudget(w,{coarse:matchMedia('(pointer:coarse)').matches,memory:navigator.deviceMemory||8});
    const ratio=Math.min(devicePixelRatio||1,config.maxDpr,Math.sqrt(1200000/(w*h)));
    if(!force&&w===width&&h===height&&budget===count&&ratio===dpr)return;
    width=w;height=h;dpr=ratio;count=budget;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);gl.viewport(0,0,canvas.width,canvas.height);
    state?.dispose();state=createGpuState(gl,count);reset=true;accumulator=0;lastTime=null;
    const mobile=w<=700,aspect=w/h;
    placement=new Float32Array([mobile?aspect*.02:aspect*.235,mobile?.18:.055,mobile?aspect*1.04:Math.min(1.06,aspect*.75),0]);
    Object.assign(canvas.dataset,{particleEngine:'gpu-orbital-nucleus',particleCount:String(count),beamMaterial:'continuous-light',pixelRatio:dpr.toFixed(2)});
   },
   restart(){startTime=null;lastTime=null;reset=true;},
   draw(time,progress=0,trail=emptyTrail,tilt=[0,0]){
    if(disposed||!state||gl.isContextLost())return;
    if(startTime===null)startTime=time;
    const age=time-startTime,dt=lastTime===null?0:Math.max(0,Math.min(1/30,time-lastTime));lastTime=time;
    accumulator+=dt;let steps=Math.min(2,Math.floor((accumulator+1e-8)*60));if(reset||age<config.assemblyDelay+config.assemblySeconds)steps=Math.max(1,steps);
    // Scroll adds a tiny spatial offset; autonomous time controls every orbit.
    const baseY=width<=700?.18:.055,offset=tiltOffset(tilt,config.gyroCorePixels,height);
    placement[0]=(width<=700?width/height*.02:width/height*.235)+offset[0];placement[1]=baseY-progress*.022+offset[1];
    const ramp=Math.max(0,Math.min(1,(age-config.beamSeconds)/3)),motion=ramp*ramp*(3-2*ramp),pose=beamPose(age,tilt,motion),lagged=beamPose(age-config.bandLag,tilt,motion);
    basis=bandBasis(lagged.direction);center=new Float32Array([placement[0]*(1-pose.depth*.38),placement[1]*(1-pose.depth*.38),pose.depth]);
    uniforms(simulation,age,trail);const su=simulation.u;

    for(const [name,value]of Object.entries({uOrbitSpeed:config.orbitSpeed,uCloudSpeed:config.cloudSpeed,uPrecession:config.precession,uBandRadius:config.bandRadius,uBandThickness:config.bandThickness,uBandHeight:config.bandHeight,uBandShear:config.bandShear,uTurbulence:config.turbulence,uTurbulenceSpeed:config.turbulenceSpeed,uCycle:config.cycleSeconds,uInfall:config.infallAmount,uEjection:config.ejectionAmount,uSpring:config.spring,uDamping:config.damping,uAssemblyDelay:config.assemblyDelay,uAssemblySeconds:config.assemblySeconds,uAspect:width/height,uDt:1/60}))gl.uniform1f(su[name],value);
    for(let i=0;i<steps;i++){gl.uniform1f(su.uReset,reset?1:0);state.step();reset=false;}
    accumulator=Math.max(0,accumulator-steps/60);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.DEPTH_TEST);state.bind();
    uniforms(points,age,trail);const pu=points.u;gl.uniform3fv(pu.uColorA,rgb(config.colorA));gl.uniform3fv(pu.uColorB,rgb(config.colorB));gl.uniform3fv(pu.uActiveColor,rgb(config.activeColor));
    const gain=config.brightness*Math.sqrt(40000/count);
    gl.uniform1f(pu.uSize,config.size*3.6);gl.uniform1f(pu.uGain,gain);gl.drawArrays(gl.POINTS,0,count);
    const intro=introState(age),ends=beamEndpoints(pose,placement,intro.beam);uniforms(beam,age,trail);
    gl.uniform4fv(beam.u.uBeamEnds,ends);gl.uniform1f(beam.u.uPulseSpeed,config.beamPulseSpeed);gl.uniform3fv(beam.u.uBeamColor,rgb(config.beamColor));gl.uniform1f(beam.u.uBeamStrength,config.beamStrength);gl.uniform1f(beam.u.uBeamGrowth,intro.beam);
    gl.enable(gl.SCISSOR_TEST);
    const left=Math.max(0,Math.floor((Math.min(ends[0],ends[2])*height+width*.5-110)*dpr)),right=Math.min(canvas.width,Math.ceil((Math.max(ends[0],ends[2])*height+width*.5+110)*dpr));
    gl.scissor(left,0,Math.max(1,right-left),canvas.height);gl.drawArrays(gl.TRIANGLES,0,3);gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.BLEND);gl.bindVertexArray(null);
    canvas.dataset.particlePhase=intro.text<1?'assembling':'orbiting';canvas.dataset.animationTime=age.toFixed(2);
    if(development){if(fpsStart===null)fpsStart=performance.now();fpsFrames++;const elapsed=performance.now()-fpsStart;if(elapsed>1200){canvas.dataset.fps=(fpsFrames*1000/elapsed).toFixed(1);fpsStart=performance.now();fpsFrames=0;}}
    return intro;
   },dispose,
   async attachDevelopmentPanel(){
    if(!development||gui||disposed)return;const {default:GUI}=await import('../node_modules/lil-gui/dist/lil-gui.esm.js');if(disposed)return;
    gui=new GUI({title:'Núcleo y galaxia · desarrollo',width:275});Object.assign(gui.domElement.style,{top:'auto',bottom:'12px',right:'12px',zIndex:'10000',maxHeight:'80vh',overflowY:'auto'});
    const refresh=()=>window.dispatchEvent(new Event('particle-config-change'));
    const core=gui.addFolder('Núcleo');core.add(config,'count',20000,60000,1000).name('Cantidad escritorio').onFinishChange(refresh);core.add(config,'mobileCount',6000,20000,1000).name('Cantidad móvil').onFinishChange(refresh);
    for(const [key,min,max,step,label]of[['bandRadius',.18,.4,.005,'Radio de banda'],['bandThickness',.025,.14,.005,'Grosor radial'],['bandHeight',.025,.14,.005,'Grosor vertical'],['bandDensity',.6,.95,.01,'Densidad de banda'],['bandShear',.5,2,.05,'Diferencia de velocidad'],['orbitSpeed',.03,.6,.01,'Velocidad orbital'],['cloudSpeed',.02,.35,.01,'Velocidad nube'],['turbulence',0,.08,.001,'Turbulencia'],['turbulenceSpeed',.02,.3,.005,'Ritmo de turbulencia'],['brightness',.2,1.5,.01,'Brillo'],['size',.7,3,.05,'Tamaño'],['beamStrength',.5,3,.05,'Luz central']])core.add(config,key,min,max,step).name(label);core.close();
    const movement=gui.addFolder('Reloj de arena');for(const [key,min,max,step]of[['beamCycleSeconds',25,100,1],['beamMaxAngle',5,40,1],['beamDepthAmplitude',.05,.5,.01],['bandLag',0,2,.05],['beamPulseSpeed',.05,.4,.005]])movement.add(config,key,min,max,step);movement.close();
    const sensor=gui.addFolder('Inclinación móvil');for(const [key,min,max,step]of[['gyroRange',10,40,1],['gyroMaxDisplacement',5,30,1],['gyroSmoothing',.1,.8,.01],['gyroMaxTilt',0,5,.25],['gyroBackPixels',0,12,1],['gyroCorePixels',0,20,1],['gyroFrontPixels',0,25,1],['gyroAuroraPixels',0,8,1]])sensor.add(config,key,min,max,step);sensor.close();
    const aurora=gui.addFolder('Aurora');for(const [key,min,max,step]of[['auroraIntensity',0,.3,.01],['auroraSpeed',.005,.08,.005],['auroraNoiseScale',.8,4,.1],['auroraCurtains',1,4,1],['auroraScroll',0,1,.05],['auroraPointer',0,1.5,.05]])aurora.add(config,key,min,max,step);for(const key of ['auroraColorA','auroraColorB','auroraColorC','auroraColorD'])aurora.addColor(config,key);aurora.add(config,'auroraResolution',.2,.5,.05).onFinishChange(refresh);aurora.add(config,'auroraMobileResolution',.2,.4,.02).onFinishChange(refresh);aurora.close();
    const galaxy=gui.addFolder('Galaxia');for(const [key,min,max,step]of[['backCount',200,4000,100],['mobileBackCount',100,1200,50],['frontCount',4,40,1],['mobileFrontCount',2,12,1]])galaxy.add(config,key,min,max,step).onFinishChange(refresh);
    for(const [key,min,max,step]of[['galaxySpeed',.05,2,.05],['frontOpacity',.02,.3,.01],['backOpacity',.1,.8,.01],['frontSize',2,12,.25],['backSize',.5,3,.05],['twinkleSpeed',.1,.8,.01],['twinkle',0,.5,.01],['parallax',0,.2,.005]])galaxy.add(config,key,min,max,step);galaxy.add(config,'maxDpr',1,2,.25).onFinishChange(refresh);galaxy.close();
    const input=gui.addFolder('Interacción');for(const [key,min,max,step]of[['repulsionRadius',35,180,1],['repulsionForce',.5,8,.1],['spring',15,90,1],['damping',6,20,.1],['trailCapacity',1,8,1],['galaxySpring',10,40,1],['galaxyDamping',5,15,.1],['trailSeconds',.3,2,.05],['galaxyRepulsion',.2,4,.1]])input.add(config,key,min,max,step);input.close();
    const colors=gui.addFolder('Colores');for(const key of ['colorA','colorB','activeColor','beamColor','backColor','frontColor'])colors.addColor(config,key);colors.close();
    const introFolder=gui.addFolder('Entrada');for(const key of ['beamSeconds','assemblyDelay','assemblySeconds','textDelay','textSeconds'])introFolder.add(config,key,0,5,.05);introFolder.add({replay:()=>window.dispatchEvent(new Event('particle-replay'))},'replay').name('Repetir entrada');introFolder.close();gui.close();
   }
  };return api;
 }catch(error){dispose();console.warn('El núcleo usa su alternativa gráfica.',error.message);return null;}
}
