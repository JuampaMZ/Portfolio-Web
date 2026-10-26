import {IS_DEVELOPMENT} from './environment.js';
import {PARTICLE_CONFIG as config,particleBudget,introState} from './particle-config.js';
import {gpuMath,fullscreenVertex,emptyFragment,rgb,createGpuResources,createGpuState} from './particle-gpu.js';
export {PARTICLE_CONFIG,particleBudget} from './particle-config.js';

const orbitalSource=`
uniform vec4 uPlacement,uRadii,uTilts,uAxes;
uniform float uOrbitSpeed,uCloudSpeed,uPrecession,uCloudRatio,uThickness,uTurbulence,uCycle,uInfall,uEjection;
vec3 orbitalTarget(float id,float time){
 float seed=random(id+8.),lane=mod(id,4.);int index=int(lane);
 bool cloud=random(id+91.)<uCloudRatio;
 float angle=random(id+4.)*6.2831853+time*(cloud?uCloudSpeed:uOrbitSpeed*(.66+lane*.23))*(mod(lane,2.)<.5?1.:-1.);
 float radius=uRadii[index];
 float phase=fract((time+random(id+31.)*uCycle)/(uCycle*(.75+random(id+12.)*.7)));
 if(random(id+27.)>.80){
  float inward=smoothstep(.06,.15,phase)*(1.-smoothstep(.22,.35,phase));
  radius*=1.-inward*uInfall;
  angle+=smoothstep(.06,.23,phase)*12.5663706;
  float flight=max(0.,sin(clamp((phase-.51)/.23,0.,1.)*3.14159265));
  radius*=1.+flight*uEjection;angle+=flight*.75;
 }
 vec3 p;
 if(cloud){
  float z=random(id+43.)*2.-1.,r=(.12+.28*pow(random(id+47.),.65))*radius/uRadii[index];
  p=vec3(cos(angle)*sqrt(1.-z*z),z*.88,sin(angle)*sqrt(1.-z*z))*r;
  p+=curlNoise(p*7.+seed,time*.23)*uTurbulence;
 }else{
  float tilt=uTilts[index],axis=uAxes[index]+time*uPrecession*(.45+lane*.21);
  p=vec3(cos(angle)*radius,sin(angle)*radius*cos(tilt),sin(angle)*radius*sin(tilt));
  p.xy=mat2(cos(axis),-sin(axis),sin(axis),cos(axis))*p.xy;
  p+=vec3(random(id+15.)-.5,random(id+18.)-.5,random(id+22.)-.5)*uThickness;
  p+=curlNoise(p*8.,time*.12)*uTurbulence*.16;
 }
 return p*uPlacement.z+vec3(uPlacement.xy,0.);
}
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
  vec3 force=(target-aPosition)*uSpring+-aVelocity*uDamping+pointerForce(aPosition);
  nextVelocity=aVelocity+force*uDt;nextVelocity*=min(1.,4./max(length(nextVelocity),.0001));
  nextPosition=aPosition+nextVelocity*uDt;
 }
 gl_Position=vec4(0.);
}`;
const pointVertex=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;layout(location=1) in vec3 aVelocity;
uniform vec2 uResolution;uniform vec4 uPlacement;uniform float uSize,uDpr,uTime,uCloudRatio;
out float vEnergy,vTint,vCloud,vActivity;
`+gpuMath+`
void main(){
 float id=float(gl_VertexID),seed=random(id+1.);vec3 p=aPosition;
 gl_Position=vec4(p.x*2.*uResolution.y/uResolution.x,p.y*2.,0.,1.);
 float depth=clamp(1.+p.z*1.15,.65,1.5);
 gl_PointSize=max(1.,uSize*uDpr*(.6+seed*.8)*depth);
 vCloud=random(id+91.)<uCloudRatio?1.:0.;vEnergy=(.42+depth*.34)*(vCloud>.5?.48:1.);
 vTint=clamp(.5+p.z,0.,1.);vActivity=clamp(length(pointerForce(p))*.5,0.,1.);
}`;
const pointFragment=`#version 300 es
precision highp float;
in float vEnergy,vTint,vCloud,vActivity;
uniform vec3 uColorA,uColorB,uActiveColor;uniform float uGain,uHalo;
out vec4 color;
void main(){
 vec2 uv=gl_PointCoord*2.-1.;float r=dot(uv,uv);if(r>1.)discard;
 float soft=exp(-r*(uHalo>.5?3.5:2.7))*(1.-smoothstep(.65,1.,r));
 vec3 tint=mix(uColorA,uColorB,vTint);tint=mix(tint,uActiveColor,vActivity*.86);
 color=vec4(tint,soft*(vEnergy+vActivity*.8)*uGain);
}`;
const beamFragment=`#version 300 es
precision highp float;
uniform vec2 uResolution;uniform vec4 uPlacement;uniform float uDpr,uTime,uBeamStrength,uBeamGrowth;uniform vec3 uBeamColor;
out vec4 color;
void main(){
 vec2 p=(gl_FragCoord.xy-.5*uResolution)/uDpr-uPlacement.xy*uResolution.y/uDpr;
 float extent=uPlacement.z*uResolution.y/uDpr*.49*max(.001,uBeamGrowth);
 float cap=1.-smoothstep(extent*.84,extent,abs(p.y));float distance=abs(p.x);
 float core=exp(-pow(distance/1.35,1.35)),inner=exp(-distance/5.5)*.46,bloom=exp(-distance/28.)*.075;
 float pulse=exp(-pow((p.y-sin(uTime*.43)*extent*.78)/32.,2.));
 float flare=exp(-distance/66.)*exp(-pow(p.y/2.4,2.))*.055;
 vec3 energy=uBeamColor*(inner+bloom)*(1.+pulse*.55)+mix(uBeamColor,vec3(1.),.7)*core*(1.4+pulse*.25);
 vec3 light=vec3(1.)-exp(-(energy*cap+uBeamColor*.8*flare)*uBeamStrength*uBeamGrowth);
 float alpha=max(light.r,max(light.g,light.b));color=vec4(light/max(alpha,.0001),alpha);
}`;

export function createCinemaRenderer(canvas){
 const gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,powerPreference:'high-performance'});if(!gl)return null;
 const resources=createGpuResources(gl);let state=null,disposed=false,width=0,height=0,dpr=1,count=0,reset=true,gui=null;
 let startTime=null,lastTime=null,accumulator=0,fpsStart=null,fpsFrames=0;
 let placement=new Float32Array(4);const emptyTrail=new Float32Array(32);
 const development=IS_DEVELOPMENT&&['localhost','127.0.0.1','[::1]'].includes(location.hostname);
 const names=['uResolution','uPlacement','uRadii','uTilts','uAxes','uOrbitSpeed','uCloudSpeed','uPrecession','uCloudRatio','uThickness','uTurbulence','uCycle','uInfall','uEjection','uTime','uDt','uReset','uSpring','uDamping','uAssemblyDelay','uAssemblySeconds','uAspect','uTrail[0]','uRadius','uRepulsion','uSize','uDpr','uColorA','uColorB','uActiveColor','uGain','uHalo','uBeamStrength','uBeamGrowth','uBeamColor'];
 function dispose(){if(disposed)return;disposed=true;gui?.destroy();state?.dispose();resources.dispose();}
 try{
  const simulation=resources.program(simulationVertex,emptyFragment,names,true),points=resources.program(pointVertex,pointFragment,names),beam=resources.program(fullscreenVertex,beamFragment,names);
  function uniforms(target,age,trail){
   gl.useProgram(target.program);const u=target.u;
   gl.uniform2f(u.uResolution,canvas.width,canvas.height);gl.uniform4fv(u.uPlacement,placement);gl.uniform1f(u.uTime,age);gl.uniform1f(u.uDpr,dpr);
   gl.uniform4fv(u['uTrail[0]'],trail);gl.uniform1f(u.uRadius,config.repulsionRadius/height);gl.uniform1f(u.uRepulsion,config.repulsionForce);
  }
  const api={
   resize(w,h,force=false){
    if(disposed||w<=0||h<=0)return;
    const budget=particleBudget(w,{coarse:matchMedia('(pointer:coarse)').matches,memory:navigator.deviceMemory||8});
    const ratio=Math.min(devicePixelRatio||1,config.maxDpr,Math.sqrt(1500000/(w*h)));
    if(!force&&w===width&&h===height&&budget===count&&ratio===dpr)return;
    width=w;height=h;dpr=ratio;count=budget;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);gl.viewport(0,0,canvas.width,canvas.height);
    state?.dispose();state=createGpuState(gl,count);reset=true;accumulator=0;lastTime=null;
    const mobile=w<=700,aspect=w/h;
    placement=new Float32Array([mobile?aspect*.02:aspect*.235,mobile?.18:.055,mobile?aspect*1.04:Math.min(1.06,aspect*.75),0]);
    Object.assign(canvas.dataset,{particleEngine:'gpu-orbital-nucleus',particleCount:String(count),beamMaterial:'continuous-light',pixelRatio:dpr.toFixed(2)});
   },
   restart(){startTime=null;lastTime=null;reset=true;},
   draw(time,progress=0,trail=emptyTrail){
    if(disposed||!state||gl.isContextLost())return;
    if(startTime===null)startTime=time;
    const age=time-startTime,dt=lastTime===null?0:Math.max(0,Math.min(1/30,time-lastTime));lastTime=time;
    accumulator+=dt;let steps=Math.min(2,Math.floor((accumulator+1e-8)*60));if(reset||age<config.assemblyDelay+config.assemblySeconds)steps=Math.max(1,steps);
    // Scroll adds a tiny spatial offset; autonomous time controls every orbit.
    const baseY=width<=700?.18:.055;placement[1]=baseY-progress*.022;
    uniforms(simulation,age,trail);const su=simulation.u;
    gl.uniform4fv(su.uRadii,config.orbitRadii);gl.uniform4fv(su.uTilts,config.orbitTilts);gl.uniform4fv(su.uAxes,config.orbitAxes);
    for(const [name,value]of Object.entries({uOrbitSpeed:config.orbitSpeed,uCloudSpeed:config.cloudSpeed,uPrecession:config.precession,uCloudRatio:config.cloudRatio,uThickness:config.orbitThickness,uTurbulence:config.turbulence,uCycle:config.cycleSeconds,uInfall:config.infallAmount,uEjection:config.ejectionAmount,uSpring:config.spring,uDamping:config.damping,uAssemblyDelay:config.assemblyDelay,uAssemblySeconds:config.assemblySeconds,uAspect:width/height,uDt:1/60}))gl.uniform1f(su[name],value);
    for(let i=0;i<steps;i++){gl.uniform1f(su.uReset,reset?1:0);state.step();reset=false;}
    accumulator=Math.max(0,accumulator-steps/60);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.DEPTH_TEST);state.bind();
    uniforms(points,age,trail);const pu=points.u;gl.uniform1f(pu.uCloudRatio,config.cloudRatio);gl.uniform3fv(pu.uColorA,rgb(config.colorA));gl.uniform3fv(pu.uColorB,rgb(config.colorB));gl.uniform3fv(pu.uActiveColor,rgb(config.activeColor));
    const gain=config.brightness*Math.sqrt(40000/count);
    gl.uniform1f(pu.uSize,config.size*3.6);gl.uniform1f(pu.uGain,gain*.055);gl.uniform1f(pu.uHalo,1);gl.drawArrays(gl.POINTS,0,count);
    gl.uniform1f(pu.uSize,config.size);gl.uniform1f(pu.uGain,gain);gl.uniform1f(pu.uHalo,0);gl.drawArrays(gl.POINTS,0,count);
    const intro=introState(age);uniforms(beam,age,trail);gl.uniform3fv(beam.u.uBeamColor,rgb(config.beamColor));gl.uniform1f(beam.u.uBeamStrength,config.beamStrength);gl.uniform1f(beam.u.uBeamGrowth,intro.beam);gl.enable(gl.SCISSOR_TEST);
    const beamLeft=Math.max(0,Math.floor((width*.5+placement[0]*height-150)*dpr));
    gl.scissor(beamLeft,0,Math.max(1,Math.min(canvas.width-beamLeft,Math.ceil(300*dpr))),canvas.height);
    gl.drawArrays(gl.TRIANGLES,0,3);gl.disable(gl.SCISSOR_TEST);
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
    for(const [key,min,max,step,label]of[['cycleSeconds',10,50,1,'Ciclo de espirales'],['orbitThickness',.002,.025,.001,'Grosor de anillo'],['orbitSpeed',.05,1.2,.01,'Velocidad orbital'],['cloudSpeed',.02,.7,.01,'Velocidad nube'],['cloudRatio',.05,.6,.01,'Proporción nube'],['turbulence',0,.08,.001,'Turbulencia'],['precession',0,.1,.001,'Precesión'],['infallAmount',0,.99,.01,'Caída al rayo'],['ejectionAmount',0,.9,.01,'Expulsión'],['brightness',.2,1.5,.01,'Brillo'],['size',.7,3,.05,'Tamaño'],['beamStrength',.5,3,.05,'Luz central']])core.add(config,key,min,max,step).name(label);
    const rings=core.addFolder('Anillos');for(let i=0;i<4;i++){rings.add(config.orbitRadii,String(i),.12,.52,.01).name('Radio '+(i+1));rings.add(config.orbitTilts,String(i),0,1.5,.01).name('Inclinación '+(i+1));rings.add(config.orbitAxes,String(i),-3.14,3.14,.01).name('Eje '+(i+1));}rings.close();core.close();
    const galaxy=gui.addFolder('Galaxia');for(const [key,min,max,step]of[['backCount',200,4000,100],['mobileBackCount',100,1200,50],['frontCount',4,40,1],['mobileFrontCount',2,12,1]])galaxy.add(config,key,min,max,step).onFinishChange(refresh);
    for(const [key,min,max,step]of[['galaxySpeed',.05,2,.05],['frontOpacity',.02,.3,.01],['backOpacity',.1,.8,.01],['frontSize',2,12,.25],['backSize',.5,3,.05],['twinkle',0,.5,.01],['parallax',0,.2,.005],['nebulaOpacity',0,.3,.01]])galaxy.add(config,key,min,max,step);galaxy.add(config,'maxDpr',1,2,.25).onFinishChange(refresh);galaxy.close();
    const input=gui.addFolder('Interacción');for(const [key,min,max,step]of[['repulsionRadius',35,180,1],['repulsionForce',.5,8,.1],['spring',15,90,1],['damping',6,20,.1],['trailCapacity',1,8,1],['galaxySpring',10,40,1],['galaxyDamping',5,15,.1],['trailSeconds',.3,2,.05],['galaxyRepulsion',.2,4,.1]])input.add(config,key,min,max,step);input.close();
    const colors=gui.addFolder('Colores');for(const key of ['colorA','colorB','activeColor','beamColor','backColor','frontColor','nebulaColorA','nebulaColorB','nebulaColorC'])colors.addColor(config,key);colors.close();
    const introFolder=gui.addFolder('Entrada');for(const key of ['beamSeconds','assemblyDelay','assemblySeconds','textDelay','textSeconds'])introFolder.add(config,key,0,5,.05);introFolder.add({replay:()=>window.dispatchEvent(new Event('particle-replay'))},'replay').name('Repetir entrada');introFolder.close();gui.close();
   }
  };return api;
 }catch(error){dispose();console.warn('El núcleo usa su alternativa gráfica.',error.message);return null;}
}
