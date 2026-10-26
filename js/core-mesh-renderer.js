import {beamMeshPose} from './beam-mesh-pose.js';
import {IS_DEVELOPMENT} from './environment.js';
import * as THREE from '../assets/three-runtime.js';
import {interlockedRings,bandBasis} from './particle-motion.js';
import {PARTICLE_CONFIG as config,particleBudget,nucleusGroups,introState} from './particle-config.js';
import {createGpuResources,emptyFragment,gpuMath} from './particle-gpu.js';
import {createMeshGpuState} from './mesh-gpu-state.js';
import {orbitalSource,simulationVertex} from './orbital-simulation.js';
import {tiltOffset} from './particle-orientation.js';

const particleVertex=`
uniform float uPointWorldSize,uViewportHeight,uDebug,uSingleRing,uTime,uRingPointScale;uniform vec3 uParticleColor,uBeamDustColor,uBeamGlowColor;out vec3 vColor;out float vOpacity;out float vDust;
`+gpuMath+orbitalSource+`
void main(){
 float id=float(gl_VertexID),seed=random(id+1.);bool band=inBand(id),gap=inGap(id);
 vec4 view=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*view;
 if(uSingleRing>.5&&(!band||secondRing(id)))gl_Position=vec4(3.,3.,3.,1.);
 gl_PointSize=max(1.,uPointWorldSize*uViewportHeight*projectionMatrix[1][1]/(-2.*view.z)*(.65+seed*.7)*(band?uRingPointScale:(gap?.38:.48)));
 vec2 tube=bandTube(id);float density=exp(-dot(tube,tube)*2.2),edge=1.-smoothstep(.65,1.15,length(tube));
 float dust=dustPhase(id,uTime),fade=smoothstep(0.,.045,dust)*(1.-smoothstep(.955,1.,dust));
 vDust=band||gap?0.:1.;vOpacity=band?min(1.,(.65+density*.65)*edge*tipOpacity(id,uTime)):(gap?uGapOpacity*tipOpacity(id,uTime):uDustOpacity*(.45+.55*abs(dust*2.-1.))*fade);
 vec3 axis=normalize(uBeamBasis[1]),relative=position-uCenter;float radial=length(relative-axis*dot(relative,axis));
 float proximity=exp(-radial/max(.001,uDustEndRadius*uPlacement.z*.6));
 vColor=band||gap?uParticleColor:mix(uBeamDustColor,uBeamGlowColor,proximity*.65);
 if(uDebug>.5){
  // Debug tint only. Never used to choose a draw pass or alter depth/blending.
  vec3 d=normalize(uBeamBasis[1]);float along=dot(position-uCenter,d);
  vColor=position.z>(uCenter+d*along).z?vec3(.95,.05,.025):vec3(.025,.16,1.);
 }
}`;
const particleFragment=`
in vec3 vColor;in float vOpacity,vDust;uniform float uDebug,uBrightness,uParticleIntensity;out vec4 outColor;
void main(){
 vec2 p=gl_PointCoord*2.-1.;float r=dot(p,p);if(r>1.)discard;
 float edge=1.-smoothstep(.25,1.,r),alpha=vOpacity*edge;if(alpha<.035)discard;
 float sphere=.55+.45*sqrt(max(0.,1.-r));
 // Keep the same alpha/depth footprint. Flat white removes spherical gray shading.
 float core=1.-smoothstep(.25,.49,r);
 vec3 light=uDebug>.5?vColor*sphere:vColor*(vDust>.5?1.:mix(1.,uParticleIntensity,core))*uBrightness;
 outColor=vec4(light,alpha);
}`;
const beamVertex=`out vec3 vNormal;out float vAxial,vFacingMax;void main(){vNormal=normalize(normalMatrix*normal);vec3 axis=normalize(mat3(modelViewMatrix)*vec3(0.,1.,0.));vFacingMax=max(.1,length(axis.xy));vAxial=uv.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const beamFragment=`in vec3 vNormal;in float vAxial,vFacingMax;uniform vec3 uColor,uCoreColor;uniform float uStrength,uPulse,uCoreStart;out vec4 outColor;
void main(){float facing=clamp(abs(vNormal.z)/vFacingMax,0.,1.),hot=smoothstep(uCoreStart,.999,facing);float pulse=1.+.08*sin(vAxial*8.-uPulse);vec3 body=uColor*uStrength*(.75+.25*facing)*pulse;vec3 core=uCoreColor*min(1.,uStrength);outColor=vec4(mix(body,core,hot),1.);}`;

export function createMeshCore(canvas,{singleRing=false,debug=false,inspection=false}={}){
 const settings=config;
 let renderer,resources,state,geometry,attribute,gui,disposed=false,count=0,width=0,height=0,dpr=1,reset=true,startTime=null,lastTime=null,fpsStart=0,fpsFrames=0;const attributes=new Map();
 try{
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,premultipliedAlpha:true,powerPreference:'high-performance'});
  const gl=renderer.getContext();renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;renderer.toneMappingExposure=1.;
  resources=createGpuResources(gl);
  const names=['uPlacement','uCenter','uRingBasisA','uRingBasisB','uBeamBasis','uRingRadii','uGap','uFlowSpeed','uTipFade','uRingCount','uGapCount','uGapOpacity','uNeckClearance','uTubeBound','uDustLength','uDustWaist','uDustEndRadius','uDustSpin','uDustFlow','uDustOpacity','uBandRadius','uBandThickness','uBandHeight','uBandShear','uTime','uDt','uReset','uSpring','uDamping','uAssemblyDelay','uAssemblySeconds','uAspect','uRecycleWindow','uTurbulence','uTurbulenceSpeed','uTrail[0]','uRadius','uRepulsion','uCameraDistance','uCameraHalfHeight','uScreenCenter'];
  const simulation=resources.program(simulationVertex,emptyFragment,names,true,true);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(settings.cameraFov,1,.04,12);camera.position.z=settings.cameraDistance;camera.updateMatrixWorld();
  const uniforms=Object.fromEntries(names.map(name=>[name,{value:0}]));
  Object.assign(uniforms,{uPointWorldSize:{value:.0035},uViewportHeight:{value:800},uDebug:{value:debug?1:0},uSingleRing:{value:singleRing?1:0},uBrightness:{value:1},uParticleIntensity:{value:settings.particleIntensity},uRingPointScale:{value:settings.ringPointScale}});
  for(const name of ['particleColor','beamDustColor','beamGlowColor'])uniforms['u'+name[0].toUpperCase()+name.slice(1)]={value:new THREE.Color(settings[name])};
  const material=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,vertexShader:particleVertex,fragmentShader:particleFragment,uniforms,toneMapped:false,transparent:true,blending:THREE.NormalBlending,depthTest:true,depthWrite:true});
  const particles=new THREE.Points(new THREE.BufferGeometry(),material);particles.frustumCulled=false;scene.add(particles);
  const beamGeometry=new THREE.CylinderGeometry(1,1,1,settings.beamSegments,20,false);
  const beamMaterial=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,vertexShader:beamVertex,fragmentShader:beamFragment,uniforms:{uColor:{value:new THREE.Color(settings.beamColor)},uCoreColor:{value:new THREE.Color(settings.beamCoreColor)},uCoreStart:{value:settings.beamCoreStart},uStrength:{value:settings.beamStrength*1.5},uPulse:{value:0}},toneMapped:false,depthWrite:true,depthTest:true,blending:THREE.NoBlending});
  const beam=new THREE.Mesh(beamGeometry,beamMaterial);scene.add(beam);
  const composer=new THREE.EffectComposer(renderer),renderPass=new THREE.RenderPass(scene,camera),bloom=new THREE.UnrealBloomPass(new THREE.Vector2(800,600),settings.bloomStrength,settings.bloomRadius,settings.bloomThreshold),output=new THREE.OutputPass();
  composer.addPass(renderPass);composer.addPass(bloom);composer.addPass(output);
  // Only the beam exceeds the bloom threshold; recolor its visible-source glow in linear space.
  bloom.compositeMaterial.uniforms.uGlowColor={value:new THREE.Color(settings.beamGlowColor)};
  bloom.compositeMaterial.fragmentShader=bloom.compositeMaterial.fragmentShader.replace('uniform float bloomStrength;','uniform float bloomStrength;uniform vec3 uGlowColor;').replace('float bloomAlpha =','bloom = uGlowColor * max(bloom.r,max(bloom.g,bloom.b));\nfloat bloomAlpha =');
  let groups={ring:0,gap:0,dust:0},placement=new Float32Array(4),center=new Float32Array(3),rings=interlockedRings(0),screenCenter=[0,0];const empty=new Float32Array(32);
  let halfView=Math.tan(settings.cameraFov*Math.PI/360);
  function values(age,trail){return {
   uPlacement:placement,uCenter:center,uRingBasisA:rings.frames[0].basis,uRingBasisB:rings.frames[1].basis,uBeamBasis:bandBasis(rings.pose.direction),uRingRadii:[rings.frames[0].radius,rings.frames[1].radius],uGap:rings.geometry.gap,uFlowSpeed:settings.ringFlowSpeed,uTipFade:settings.ringTipFade,uRingCount:groups.ring,uGapCount:groups.gap,uGapOpacity:settings.gapOpacity,uNeckClearance:rings.geometry.clearanceFraction,uTubeBound:rings.geometry.tube,
   uDustLength:settings.beamDustLength,uDustWaist:settings.beamDustWaist,uDustEndRadius:settings.beamDustEndRadius,uDustSpin:settings.beamDustSpin,uDustFlow:settings.beamDustFlow,uDustOpacity:settings.beamDustOpacity,
   uBandRadius:rings.geometry.radius,uBandThickness:rings.geometry.thickness,uBandHeight:rings.geometry.height,uBandShear:settings.bandShear,uTime:age,uTurbulence:settings.turbulence,uTurbulenceSpeed:settings.turbulenceSpeed,uSpring:settings.spring,uDamping:settings.damping,uAssemblyDelay:settings.assemblyDelay,uAssemblySeconds:settings.assemblySeconds,uAspect:width/height,'uTrail[0]':trail,uRadius:settings.repulsionRadius/height,uRepulsion:settings.repulsionForce,uCameraDistance:settings.cameraDistance,uCameraHalfHeight:halfView,uScreenCenter:screenCenter};}
  function simulationUniforms(data){gl.useProgram(simulation.program);for(const [name,value]of Object.entries(data)){const u=simulation.u[name];if(u===null)continue;if(typeof value==='number')gl.uniform1f(u,value);else if(value.length===9)gl.uniformMatrix3fv(u,false,value);else if(value.length===32)gl.uniform4fv(u,value);else gl['uniform'+value.length+'fv'](u,value);}}
  function releaseGeometry(){if(!geometry)return;geometry.deleteAttribute('position');geometry.dispose();geometry=null;state?.dispose();state=null;attributes.clear();}
  function resize(w,h,force=false){
   if(disposed||w<=0||h<=0)return;const coarse=matchMedia('(pointer:coarse)').matches,budget=particleBudget(w,{coarse,memory:navigator.deviceMemory||8});
   const ratio=Math.min(devicePixelRatio||1,settings.maxDpr,Math.sqrt(1200000/(w*h)));
   if(!force&&w===width&&h===height&&budget===count&&ratio===dpr)return;
   width=w;height=h;count=budget;dpr=ratio;renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);composer.setPixelRatio(dpr);composer.setSize(w,h);
   const bloomScale=w<=700?settings.bloomMobileResolution:settings.bloomResolution;bloom.setSize(Math.round(canvas.width*bloomScale),Math.round(canvas.height*bloomScale));halfView=Math.tan(settings.cameraFov*Math.PI/360);camera.fov=settings.cameraFov;camera.position.z=settings.cameraDistance;camera.aspect=w/h;camera.updateProjectionMatrix();
   releaseGeometry();renderer.resetState();state=createMeshGpuState(gl,count);renderer.resetState();
   geometry=new THREE.BufferGeometry();geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),10);attribute=new THREE.GLBufferAttribute(state.position,gl.FLOAT,3,4,count);geometry.setAttribute('position',attribute);geometry.setDrawRange(0,count);particles.geometry=geometry;
   groups=singleRing?{ring:count,gap:0,dust:0}:nucleusGroups(count,w,{coarse},settings,interlockedRings(0).geometry.gap);reset=true;lastTime=null;
   placement=new Float32Array([0,0,w<=700?Math.min(.52,w/h*1.04):.82,0]);
   Object.assign(canvas.dataset,{particleEngine:'three-mesh-gpu',particleCount:String(count),ringCount:String(groups.ring),gapCount:String(groups.gap),beamDustCount:String(groups.dust),beamMaterial:'CylinderGeometry',camera:'PerspectiveCamera',fov:String(camera.fov),occlusion:'depth-buffer-normal-alpha',pixelRatio:dpr.toFixed(2),bloom:'postprocess-after-depth'});
  }
  function draw(time,progress=0,trail=empty,tilt=[0,0]){
   if(disposed||!state||gl.isContextLost())return;if(startTime===null)startTime=time;
   const age=time-startTime,elapsed=lastTime===null?0:Math.max(0,time-lastTime),dt=Math.min(1/30,elapsed);lastTime=time;
   const shouldStep=reset||dt>0||age<settings.assemblyDelay+settings.assemblySeconds;
   const offset=tiltOffset(tilt,settings.gyroCorePixels,height),mobile=width<=700;
   screenCenter=singleRing?[0,0]:[(mobile?width/height*.02:width/height*.235)+offset[0],(mobile?.18:.055)-progress*.022+offset[1]];
   camera.setViewOffset(width,height,-screenCenter[0]*height,screenCenter[1]*height,width,height);camera.updateMatrixWorld();
   const ramp=Math.max(0,Math.min(1,(age-settings.beamSeconds)/3)),motion=ramp*ramp*(3-2*ramp);
   rings=interlockedRings(age,tilt,motion);center=new Float32Array([0,0,rings.pose.depth]);
   const data=values(age,trail);
   if(shouldStep){simulationUniforms({...data,uDt:dt||1/60,uRecycleWindow:Math.max(1/60,Math.min(.2,elapsed))});
    gl.uniform1f(simulation.u.uReset,reset?1:0);state.step();reset=false;renderer.resetState();
   }
   if(!attributes.has(state.position))attributes.set(state.position,new THREE.GLBufferAttribute(state.position,gl.FLOAT,3,4,count));attribute=attributes.get(state.position);geometry.setAttribute('position',attribute);
   for(const [name,value]of Object.entries(data)){if(uniforms[name])uniforms[name].value=value;}uniforms.uTrail={value:trail};
   uniforms.uBeamBasis.value=new THREE.Matrix3().fromArray(data.uBeamBasis);uniforms.uRingBasisA.value=new THREE.Matrix3().fromArray(data.uRingBasisA);uniforms.uRingBasisB.value=new THREE.Matrix3().fromArray(data.uRingBasisB);
   uniforms.uPointWorldSize.value=settings.size*.0027;uniforms.uViewportHeight.value=canvas.height;uniforms.uBrightness.value=settings.brightness/.85;uniforms.uParticleIntensity.value=settings.particleIntensity;uniforms.uRingPointScale.value=settings.ringPointScale;
   for(const name of ['particleColor','beamDustColor','beamGlowColor'])uniforms['u'+name[0].toUpperCase()+name.slice(1)].value.set(settings[name]);beamMaterial.uniforms.uColor.value.set(settings.beamColor);beamMaterial.uniforms.uCoreColor.value.set(settings.beamCoreColor);beamMaterial.uniforms.uCoreStart.value=settings.beamCoreStart;bloom.compositeMaterial.uniforms.uGlowColor.value.set(settings.beamGlowColor);
   const intro=introState(age),shape=beamMeshPose(rings.pose,placement[2],screenCenter,intro.beam,settings),radius=shape.radius;
   beam.position.set(...shape.center);beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...shape.direction));beam.scale.set(radius,shape.length,radius);beam.visible=intro.beam>.001;beamMaterial.uniforms.uStrength.value=settings.beamStrength*1.5*intro.beam;beamMaterial.uniforms.uPulse.value=age*settings.beamPulseSpeed;
   bloom.enabled=!debug;bloom.strength=settings.bloomStrength;bloom.radius=settings.bloomRadius;bloom.threshold=settings.bloomThreshold;composer.render();
   const endpoints=shape.endpoints.map(p=>new THREE.Vector3(...p));
   const radii=endpoints.map(p=>radius*canvas.height/(2*halfView*(camera.position.z-p.z)));
   Object.assign(canvas.dataset,{animationTime:age.toFixed(2),particlePhase:intro.text<1?'assembling':'orbiting',beamNearEnd:radii[1]>radii[0]?'superior':'inferior',beamNearRadius:Math.max(...radii).toFixed(3),beamFarRadius:Math.min(...radii).toFixed(3)});
   if(!fpsStart)fpsStart=performance.now();fpsFrames++;if(performance.now()-fpsStart>1500){canvas.dataset.fps=(fpsFrames*1000/(performance.now()-fpsStart)).toFixed(1);fpsFrames=0;fpsStart=performance.now();}
   return intro;
  }
  const api={resize,draw,restart(){startTime=null;lastTime=null;reset=true;},setDebug(value){debug=value;uniforms.uDebug.value=value?1:0;},
   // Only local test pages call these; production never reads back GPU buffers.
   inspect:inspection?{renderer,scene,camera,beam,particles,composer,bloom,get state(){return state;},get groups(){return groups;}}:undefined,
   async attachDevelopmentPanel(){if(!IS_DEVELOPMENT||gui||disposed)return;const {createParticlePanel}=await import('./particle-panel.js');if(disposed)return;gui=await createParticlePanel();if(disposed)gui?.destroy();},
   dispose(){if(disposed)return;disposed=true;gui?.destroy();releaseGeometry();material.dispose();beamGeometry.dispose();beamMaterial.dispose();bloom.dispose();renderPass.dispose();output.dispose();composer.dispose();resources.dispose();renderer.dispose();if(!gl.isContextLost())renderer.forceContextLoss();}
  };return api;
 }catch(error){state?.dispose();resources?.dispose();renderer?.dispose();console.error('No se pudo crear el núcleo 3D.',error);return null;}
}
