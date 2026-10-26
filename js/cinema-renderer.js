import {interlockedRings,bandBasis,beamEndpoints} from './particle-motion.js';
import {tiltOffset} from './particle-orientation.js';
import {IS_DEVELOPMENT} from './environment.js';
import {PARTICLE_CONFIG as config,particleBudget,nucleusGroups,introState} from './particle-config.js';
import {gpuMath,fullscreenVertex,emptyFragment,rgb,createGpuResources,createGpuState} from './particle-gpu.js';
export {PARTICLE_CONFIG,particleBudget} from './particle-config.js';

const orbitalSource=`
uniform vec4 uPlacement;uniform vec3 uCenter;uniform mat3 uRingBasisA,uRingBasisB,uVortexBasis;uniform vec2 uRingRadii;
uniform float uRingCount,uGapCount,uGapOpacity,uTipScale,uTipTaper,uVortexRadius,uVortexSpeed,uVortexTurbulence;
uniform float uFlowSpeed,uGap,uTipFade,uBandRadius,uBandThickness,uBandHeight,uBandShear,uTurbulence,uTurbulenceSpeed;
vec2 bandTube(float id){
 float radius=min(1.12,sqrt(-2.*log(max(random(id+15.),.00001)))*.36),angle=random(id+18.)*6.2831853;
 return vec2(cos(angle),sin(angle))*radius;
}
bool inBand(float id){return id<uRingCount;}
bool inGap(float id){return id>=uRingCount&&id<uRingCount+uGapCount;}
bool secondRing(float id){return mod(id,2.)>.5;}
float ringPhase(float id,float time){
 float radius=max(.05,uBandRadius+bandTube(id).x*uBandThickness);
 float speed=uFlowSpeed*pow(uBandRadius/radius,uBandShear)*(secondRing(id)?-1.:1.);
 return fract(random(id+4.)+time*speed/(inGap(id)?uGap:6.2831853-uGap));
}
float tipOpacity(float id,float time){float phase=ringPhase(id,time),fade=inGap(id)?.12:uTipFade;return smoothstep(0.,fade,phase)*(1.-smoothstep(1.-fade,1.,phase));}
float tipScale(float phase){float distance=min(phase,1.-phase)*(6.2831853-uGap);return mix(uTipScale,1.,clamp(distance/uTipTaper,0.,1.));}
vec3 vortexLocal(float id,float time){
 float seed=random(id+23.),phase=time*(.19+seed*.075)+random(id+31.)*6.2831853;
 float breath=.5+.5*sin(phase),radius=uVortexRadius*(.12+.88*pow(breath,1.3))*(.55+seed*.45);
 float angle=random(id+4.)*6.2831853+time*uVortexSpeed*(.75+seed*.6)+(1.-breath)*5.;
 vec3 p=vec3(cos(angle)*radius,(random(id+43.)-.5)*uVortexRadius*.3,sin(angle)*radius);
 return p+curlNoise(p*24.,time*.6)*uVortexTurbulence;
}
vec3 orbitalTarget(float id,float time){
 vec3 p;
 if(inBand(id)||inGap(id)){
  bool second=secondRing(id),gap=inGap(id);vec2 tube=bandTube(id);float phase=ringPhase(id,time);
  float angle=(second?3.14159265:0.)+(gap?-uGap*.5:uGap*.5)+phase*(gap?uGap:6.2831853-uGap);
  float taper=gap?.27:tipScale(phase),radius=(second?uRingRadii.y:uRingRadii.x)+tube.x*uBandThickness*taper;
  p=vec3(cos(angle)*radius,tube.y*uBandHeight*taper,sin(angle)*radius);
  p+=curlNoise(p*8.,time*uTurbulenceSpeed*.52)*min(uTurbulence,.08)*.10*taper;
  p=(second?uRingBasisB:uRingBasisA)*p;
 }else p=uVortexBasis*vortexLocal(id,time);
 return p*uPlacement.z+uCenter;
}
vec3 nucleusPointer(vec3 p){float perspective=1./max(.55,1.-p.z*.38);vec3 force=pointerForce(vec3(p.xy*perspective,p.z));force.xy/=perspective;return force;}
`;
const simulationVertex=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;layout(location=1) in vec3 aVelocity;
uniform float uTime,uDt,uReset,uSpring,uDamping,uAssemblyDelay,uAssemblySeconds,uAspect,uRecycleWindow;
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
 }// Recycle only while both tips are invisible; never integrate across the gap.
 else if(uReset>.5||((inBand(id)||inGap(id))&&abs(ringPhase(id,uTime)-ringPhase(id,uTime-uRecycleWindow))>.5)){nextPosition=target;nextVelocity=vec3(0.);}
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
out float vEnergy,vTint,vActivity,vRing;
`+gpuMath+orbitalSource+`
void main(){
 float id=float(gl_VertexID),seed=random(id+1.);bool band=inBand(id),gap=inGap(id);vec3 p=aPosition;float perspective=1./max(.55,1.-p.z*.38);
 gl_Position=vec4(p.x*perspective*2.*uResolution.y/uResolution.x,p.y*perspective*2.,0.,1.);
 gl_PointSize=max(1.,uSize*uDpr*(.6+seed*.8)*clamp(perspective,.7,1.5)*(band?1.:(gap?.55:.62)));
 vec2 tube=bandTube(id);
 float density=exp(-dot(tube,tube)*2.2),edge=1.-smoothstep(.65,1.15,length(tube));
 vEnergy=band?(.40+density*1.2)*edge*tipOpacity(id,uTime):(gap?uGapOpacity*tipOpacity(id,uTime):(.45+1.8*exp(-length(vortexLocal(id,uTime))/max(.02,uVortexRadius)*2.)));
 vRing=secondRing(id)?1.:0.;
 vTint=band||gap?clamp(.45+p.z*.7,0.,1.):1.8;vActivity=clamp(length(nucleusPointer(p))*.5,0.,1.);
}`;
const pointFragment=`#version 300 es
precision highp float;
in float vEnergy,vTint,vActivity,vRing;
uniform vec3 uColorA,uColorB,uActiveColor,uRingColorA,uRingColorB;uniform float uGain;
out vec4 color;
void main(){
 vec2 uv=gl_PointCoord*2.-1.;float r=dot(uv,uv);if(r>1.)discard;
 // Combine the soft halo and sharp center in one point pass.
 float halo=exp(-r*3.5)*(1.-smoothstep(.65,1.,r));
 float coreRadius=r*12.96,core=exp(-coreRadius*2.7)*(1.-smoothstep(.65,1.,coreRadius));
 float soft=core+halo*.055;
 vec3 tint=mix(mix(uRingColorA,uRingColorB,vRing),mix(uColorA,uColorB,vTint),.35);tint=mix(tint,uActiveColor,max(vActivity*.86,step(1.,vTint)*.65));
 color=vec4(tint,soft*vEnergy*(1.+vActivity*.65)*uGain);
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
 let placement=new Float32Array(4),center=new Float32Array(3),rings=interlockedRings(0),groups={ring:0,gap:0,vortex:0};const emptyTrail=new Float32Array(32);
 const development=IS_DEVELOPMENT&&['localhost','127.0.0.1','[::1]'].includes(location.hostname);
 const names=['uResolution','uPlacement','uCenter','uRingBasisA','uRingBasisB','uRingRadii','uGap','uFlowSpeed','uTipFade','uBandRadius','uBandThickness','uBandHeight','uVortexBasis','uRingCount','uGapCount','uGapOpacity','uTipScale','uTipTaper','uVortexRadius','uVortexSpeed','uVortexTurbulence','uBandShear','uBeamEnds','uPulseSpeed','uTurbulenceSpeed','uTurbulence','uTime','uDt','uReset','uSpring','uDamping','uAssemblyDelay','uAssemblySeconds','uAspect','uRecycleWindow','uTrail[0]','uRadius','uRepulsion','uSize','uDpr','uColorA','uColorB','uActiveColor','uGain','uRingColorA','uRingColorB','uBeamStrength','uBeamGrowth','uBeamColor'];
 function dispose(){if(disposed)return;disposed=true;gui?.destroy();state?.dispose();resources.dispose();}
 try{
  const simulation=resources.program(simulationVertex,emptyFragment,names,true),points=resources.program(pointVertex,pointFragment,names),beam=resources.program(fullscreenVertex,beamFragment,names);
  function uniforms(target,age,trail){
   gl.useProgram(target.program);const u=target.u;
   gl.uniform2f(u.uResolution,canvas.width,canvas.height);gl.uniform4fv(u.uPlacement,placement);gl.uniform3fv(u.uCenter,center);gl.uniformMatrix3fv(u.uRingBasisA,false,rings.frames[0].basis);gl.uniformMatrix3fv(u.uRingBasisB,false,rings.frames[1].basis);gl.uniform2f(u.uRingRadii,rings.frames[0].radius,rings.frames[1].radius);gl.uniform1f(u.uGap,rings.geometry.gap);gl.uniform1f(u.uFlowSpeed,config.ringFlowSpeed);gl.uniform1f(u.uTipFade,Math.max(.025,Math.min(.2,config.ringTipFade)));gl.uniformMatrix3fv(u.uVortexBasis,false,bandBasis(rings.pose.direction));gl.uniform1f(u.uRingCount,groups.ring);gl.uniform1f(u.uGapCount,groups.gap);gl.uniform1f(u.uGapOpacity,config.gapOpacity);gl.uniform1f(u.uTipScale,rings.geometry.tipScale);gl.uniform1f(u.uTipTaper,rings.geometry.tipTaper);gl.uniform1f(u.uVortexRadius,Math.min(config.vortexRadius,rings.geometry.radius*.38));gl.uniform1f(u.uVortexSpeed,config.vortexSpeed);gl.uniform1f(u.uVortexTurbulence,Math.min(.02,config.vortexTurbulence));gl.uniform1f(u.uBandRadius,rings.geometry.radius);gl.uniform1f(u.uBandThickness,rings.geometry.thickness);gl.uniform1f(u.uBandShear,config.bandShear);gl.uniform1f(u.uTime,age);gl.uniform1f(u.uDpr,dpr);
   gl.uniform4fv(u['uTrail[0]'],trail);gl.uniform1f(u.uRadius,config.repulsionRadius/height);gl.uniform1f(u.uRepulsion,config.repulsionForce);
  }
  const api={
   resize(w,h,force=false){
    if(disposed||w<=0||h<=0)return;
    const coarse=matchMedia('(pointer:coarse)').matches,budget=particleBudget(w,{coarse,memory:navigator.deviceMemory||8});
    groups=nucleusGroups(budget,w,{coarse},config,interlockedRings(0).geometry.gap);
    const ratio=Math.min(devicePixelRatio||1,config.maxDpr,Math.sqrt(1200000/(w*h)));
    if(!force&&w===width&&h===height&&budget===count&&ratio===dpr)return;
    width=w;height=h;dpr=ratio;count=budget;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);gl.viewport(0,0,canvas.width,canvas.height);
    state?.dispose();state=createGpuState(gl,count);reset=true;accumulator=0;lastTime=null;
    const mobile=w<=700,aspect=w/h;
    placement=new Float32Array([mobile?aspect*.02:aspect*.235,mobile?.18:.055,mobile?aspect*1.04:Math.min(1.06,aspect*.75),0]);
    Object.assign(canvas.dataset,{particleEngine:'gpu-orbital-nucleus',particleCount:String(count),beamMaterial:'continuous-light',ringCount:String(groups.ring),gapCount:String(groups.gap),vortexCount:String(groups.vortex),pixelRatio:dpr.toFixed(2)});
   },
   restart(){startTime=null;lastTime=null;reset=true;},
   draw(time,progress=0,trail=emptyTrail,tilt=[0,0]){
    if(disposed||!state||gl.isContextLost())return;
    if(startTime===null)startTime=time;
    const age=time-startTime,elapsed=lastTime===null?0:Math.max(0,time-lastTime),dt=Math.min(1/30,elapsed);lastTime=time;
    accumulator+=dt;let steps=Math.min(2,Math.floor((accumulator+1e-8)*60));if(reset||age<config.assemblyDelay+config.assemblySeconds)steps=Math.max(1,steps);
    // Scroll adds a tiny spatial offset; autonomous time controls every orbit.
    const baseY=width<=700?.18:.055,offset=tiltOffset(tilt,config.gyroCorePixels,height);
    placement[0]=(width<=700?width/height*.02:width/height*.235)+offset[0];placement[1]=baseY-progress*.022+offset[1];
    const ramp=Math.max(0,Math.min(1,(age-config.beamSeconds)/3)),motion=ramp*ramp*(3-2*ramp),scene=interlockedRings(age,tilt,motion),pose=scene.pose;
    rings=scene;center=new Float32Array([placement[0]*(1-pose.depth*.38),placement[1]*(1-pose.depth*.38),pose.depth]);
    uniforms(simulation,age,trail);const su=simulation.u;

    for(const [name,value]of Object.entries({uBandRadius:rings.geometry.radius,uBandThickness:rings.geometry.thickness,uBandHeight:rings.geometry.height,uBandShear:config.bandShear,uTurbulence:config.turbulence,uTurbulenceSpeed:config.turbulenceSpeed,uSpring:config.spring,uDamping:config.damping,uAssemblyDelay:config.assemblyDelay,uAssemblySeconds:config.assemblySeconds,uAspect:width/height,uRecycleWindow:Math.max(1/60,Math.min(.2,elapsed)),uDt:1/60}))gl.uniform1f(su[name],value);
    for(let i=0;i<steps;i++){gl.uniform1f(su.uReset,reset?1:0);state.step();reset=false;}
    accumulator=Math.max(0,accumulator-steps/60);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.DEPTH_TEST);state.bind();
    uniforms(points,age,trail);const pu=points.u;gl.uniform3fv(pu.uColorA,rgb(config.colorA));gl.uniform3fv(pu.uColorB,rgb(config.colorB));gl.uniform3fv(pu.uActiveColor,rgb(config.activeColor));gl.uniform3fv(pu.uRingColorA,rgb(config.ringColorA));gl.uniform3fv(pu.uRingColorB,rgb(config.ringColorB));
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
    for(const [key,min,max,step,label]of[['bandRadius',.18,.4,.005,'Radio de banda'],['bandThickness',.025,.14,.005,'Grosor radial'],['bandHeight',.025,.14,.005,'Grosor vertical'],['bandShear',.5,2,.05,'Diferencia de velocidad'],['ringFlowSpeed',.03,.5,.01,'Velocidad de flujo'],['ringGapDegrees',25,100,1,'Apertura de los huecos'],['ringLagA',0,2,.05,'Retraso C azul'],['ringLagB',0,2,.05,'Retraso C violeta'],['ringWobble',0,3,.1,'Bamboleo propio'],['ringBreath',0,.008,.001,'Respiración'],['ringOrientation',20,60,1,'Ángulo del conjunto'],['ringTipFade',.015,.08,.005,'Desvanecer puntas'],['turbulence',0,.08,.001,'Turbulencia'],['turbulenceSpeed',.02,.3,.005,'Ritmo de turbulencia'],['brightness',.2,1.5,.01,'Brillo'],['size',.7,3,.05,'Tamaño'],['beamStrength',.5,3,.05,'Luz central']]){const control=core.add(config,key,min,max,step).name(label);if(key==='ringGapDegrees')control.onFinishChange(refresh);}core.close();
    const gap=gui.addFolder('Flujo del hueco');gap.add(config,'gapDensity',0,.12,.005).name('Densidad relativa').onFinishChange(refresh);gap.add(config,'gapOpacity',.04,.35,.01).name('Opacidad');gap.close();
    const vortex=gui.addFolder('Vórtice junto al rayo');vortex.add(config,'vortexCount',0,6000,100).name('Cantidad escritorio').onFinishChange(refresh);vortex.add(config,'mobileVortexCount',0,2000,100).name('Cantidad móvil').onFinishChange(refresh);vortex.add(config,'vortexRadius',.035,.11,.005).name('Radio');vortex.add(config,'vortexSpeed',.5,2,.05).name('Giro');vortex.add(config,'vortexTurbulence',0,.02,.001).name('Turbulencia');vortex.close();
    const movement=gui.addFolder('Reloj de arena');for(const [key,min,max,step]of[['beamCycleSeconds',25,100,1],['beamMaxAngle',5,40,1],['beamDepthAmplitude',.05,.5,.01],['beamPulseSpeed',.05,.4,.005]])movement.add(config,key,min,max,step);movement.close();
    const sensor=gui.addFolder('Inclinación móvil');for(const [key,min,max,step]of[['gyroRange',10,40,1],['gyroMaxDisplacement',5,30,1],['gyroSmoothing',.1,.8,.01],['gyroMaxTilt',0,5,.25],['gyroBackPixels',0,12,1],['gyroCorePixels',0,20,1],['gyroFrontPixels',0,25,1],['gyroAuroraPixels',0,8,1]])sensor.add(config,key,min,max,step);sensor.close();
    const aurora=gui.addFolder('Aurora');for(const [key,min,max,step]of[['auroraIntensity',0,.3,.01],['auroraSpeed',.005,.08,.005],['auroraNoiseScale',.8,4,.1],['auroraCurtains',1,4,1],['auroraScroll',0,1,.05],['auroraPointer',0,1.5,.05]])aurora.add(config,key,min,max,step);for(const key of ['auroraColorA','auroraColorB','auroraColorC','auroraColorD'])aurora.addColor(config,key);aurora.add(config,'auroraResolution',.2,.5,.05).onFinishChange(refresh);aurora.add(config,'auroraMobileResolution',.2,.4,.02).onFinishChange(refresh);aurora.close();
    const galaxy=gui.addFolder('Galaxia');for(const [key,min,max,step]of[['smallCount',200,4000,100],['mediumCount',50,800,50],['mobileSmallCount',100,1200,50],['mobileMediumCount',25,300,25],['frontCount',4,40,1],['mobileFrontCount',2,12,1]])galaxy.add(config,key,min,max,step).onFinishChange(refresh);
    for(const [key,min,max,step]of[['travelSpeed',.005,.035,.001],['depthTravelRatio',0,.7,.05],['planetHalo',0,.5,.01],['planetTrail',0,.15,.01],['mediumSpeed',1,2,.05],['frontSpeed',1,3,.05],['mediumParallax',1,2,.1],['frontParallax',1,3,.1],['galaxyBrightness',.8,1.5,.05],['frontOpacity',.02,.35,.01],['smallOpacity',.1,.9,.01],['mediumOpacity',.1,.95,.01],['smallSizeMin',.5,1.2,.1],['smallSizeMax',1.3,2.2,.1],['mediumSizeMin',1.8,2.8,.1],['mediumSizeMax',3,5,.1],['frontSizeMin',4,8,.25],['frontSizeMax',9,16,.25],['twinkleSpeed',.1,.8,.01],['twinkle',0,.5,.01],['parallax',0,.2,.005]])galaxy.add(config,key,min,max,step);galaxy.add(config,'maxDpr',1,2,.25).onFinishChange(refresh);galaxy.close();
    const input=gui.addFolder('Interacción');for(const [key,min,max,step]of[['repulsionRadius',35,180,1],['repulsionForce',.5,8,.1],['spring',15,90,1],['damping',6,20,.1],['trailCapacity',1,8,1],['galaxySpring',10,40,1],['galaxyDamping',5,15,.1],['trailSeconds',.3,2,.05],['galaxyRepulsion',.2,4,.1]])input.add(config,key,min,max,step);input.close();
    const colors=gui.addFolder('Colores');for(const key of ['colorA','colorB','ringColorA','ringColorB','activeColor','beamColor','backColor','frontColor'])colors.addColor(config,key);colors.close();
    const introFolder=gui.addFolder('Entrada');for(const key of ['beamSeconds','assemblyDelay','assemblySeconds','textDelay','textSeconds'])introFolder.add(config,key,0,5,.05);introFolder.add({replay:()=>window.dispatchEvent(new Event('particle-replay'))},'replay').name('Repetir entrada');introFolder.close();gui.close();
   }
  };return api;
 }catch(error){dispose();console.warn('El núcleo usa su alternativa gráfica.',error.message);return null;}
}
