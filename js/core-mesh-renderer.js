import {energyVertex,energyFragment} from './energy-beam.js';
import {waitForGpu} from './gpu-ready.js';
import {beamColors} from './beam-colors.js';
import {sphereVertex,sphereFragment} from './particle-sphere.js';
import {beamMeshPose} from './beam-mesh-pose.js';
import {IS_DEVELOPMENT} from './environment.js';
import * as THREE from '../assets/three-runtime.js';
import {interlockedRings,bandBasis} from './particle-motion.js';
import {PARTICLE_CONFIG as config,particleBudget,nucleusGroups,introState} from './particle-config.js';
import {createGpuResources,emptyFragment} from './particle-gpu.js';
import {createMeshGpuState} from './mesh-gpu-state.js';
import {simulationVertex} from './orbital-simulation.js';
import {tiltOffset} from './particle-orientation.js';

export function createMeshCore(canvas,{singleRing=false,debug=false,inspection=false}={}){
 const settings=config;
 let renderer,resources,state,geometry,attribute,gui,disposed=false,count=0,width=0,height=0,dpr=1,reset=true,startTime=null,lastTime=null,fpsStart=0,fpsFrames=0;const attributes=new Map();
 try{
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,premultipliedAlpha:true,powerPreference:'high-performance'});
  const gl=renderer.getContext();renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;renderer.toneMappingExposure=1.;
  resources=createGpuResources(gl);
  const names=['uPlacement','uCenter','uRingBasisA','uRingBasisB','uBeamBasis','uRingRadii','uGap','uFlowSpeed','uTipFade','uRingCount','uGapCount','uGapOpacity','uNeckClearance','uTubeBound','uDustLength','uDustWaist','uDustEndRadius','uDustSpin','uDustFlow','uDustOpacity','uBandRadius','uBandThickness','uBandHeight','uBandShear','uTime','uDt','uReset','uSpring','uDamping','uAssemblyDelay','uAssemblySeconds','uAspect','uRecycleWindow','uTurbulence','uTurbulenceSpeed','uTrail[0]','uRadius','uRepulsion','uCameraDistance','uCameraHalfHeight','uScreenCenter','uPointerDepth','uPointerSwirl','uReturnSpread'];
  const simulation=resources.program(simulationVertex,emptyFragment,names,true,true);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(settings.cameraFov,1,.04,12);camera.position.z=settings.cameraDistance;camera.updateMatrixWorld();
  const uniforms=Object.fromEntries(names.map(name=>[name,{value:0}]));
  Object.assign(uniforms,{uSphereRadius:{value:settings.sphereRadius},uViewportHeight:{value:800},uDpr:{value:1},uLodPixels:{value:settings.sphereLodPixels},uDofStrength:{value:settings.sphereDof},uFocusRange:{value:settings.sphereFocusRange},uFocusDistance:{value:settings.cameraDistance},uDebug:{value:debug?1:0},uSingleRing:{value:singleRing?1:0},uRingOpacity:{value:settings.ringOpacity},uParticleColor:{value:new THREE.Color(settings.particleColor)},uDustColor:{value:new THREE.Color(settings.beamDustColor)},uBeamViewA:{value:new THREE.Vector3()},uBeamViewB:{value:new THREE.Vector3()},uProjection:{value:camera.projectionMatrix},uInverseProjection:{value:camera.projectionMatrixInverse},uResolution:{value:new THREE.Vector2()},uBeamLightColor:{value:new THREE.Color()},uDiffuse:{value:settings.sphereDiffuse},uAmbient:{value:settings.sphereAmbient},uSpecular:{value:settings.sphereSpecular},uShininess:{value:settings.sphereShininess},uRim:{value:settings.sphereRim},uRimPower:{value:settings.sphereRimPower},uActivityBrightness:{value:settings.ringActivityBrightness}});
  const material=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,vertexShader:sphereVertex,fragmentShader:sphereFragment,uniforms,toneMapped:false,transparent:true,blending:THREE.NormalBlending,depthTest:true,depthWrite:true});
  const particles=new THREE.Points(new THREE.BufferGeometry(),material);particles.frustumCulled=false;scene.add(particles);
  const beamGeometry=new THREE.CylinderGeometry(1,1,1,settings.beamSegments,settings.beamLengthSegments,false);
  const makeBeamMaterial=layer=>new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,vertexShader:energyVertex,fragmentShader:energyFragment,uniforms:{uColor:{value:new THREE.Color(settings.beamColor)},uCoreColor:{value:new THREE.Color(0xffffff)},uCoreStart:{value:settings.beamCoreStart},uStrength:{value:settings.beamStrength},uPulse:{value:0},uTime:{value:0},uLayer:{value:layer},uFresnel:{value:settings.beamFresnel},uNoiseSpeed:{value:settings.beamNoiseSpeed},uNoiseScale:{value:settings.beamNoiseScale},uThicknessWave:{value:settings.beamThicknessWave},uPulseIntensity:{value:settings.beamPulseIntensity},uEnvelopeOpacity:{value:settings.beamEnvelopeOpacity}},toneMapped:false,transparent:layer>0,depthWrite:layer<2,depthTest:true,blending:layer>0?THREE.NormalBlending:THREE.NoBlending});
  const beamMaterial=makeBeamMaterial(1),coreMaterial=makeBeamMaterial(0),envelopeMaterial=makeBeamMaterial(2),beamMaterials=[beamMaterial,coreMaterial,envelopeMaterial];
  const beam=new THREE.Mesh(beamGeometry,beamMaterial),hotCore=new THREE.Mesh(beamGeometry,coreMaterial),envelope=new THREE.Mesh(beamGeometry,envelopeMaterial);
  beam.renderOrder=-1;envelope.renderOrder=1;hotCore.scale.set(settings.beamCoreRadius,1,settings.beamCoreRadius);envelope.scale.set(settings.beamEnvelopeRadius,1,settings.beamEnvelopeRadius);beam.add(hotCore,envelope);scene.add(beam);
  const composer=new THREE.EffectComposer(renderer),renderPass=new THREE.RenderPass(scene,camera),bloom=new THREE.UnrealBloomPass(new THREE.Vector2(800,600),settings.bloomStrength,settings.bloomRadius,settings.bloomThreshold),output=new THREE.OutputPass();
  composer.addPass(renderPass);composer.addPass(bloom);composer.addPass(output);
  // Select chromatic beam light after depth resolution; keep white sphere highlights out of its halo.
  bloom.compositeMaterial.uniforms.uGlowColor={value:new THREE.Color(settings.beamColor)};
  bloom.compositeMaterial.fragmentShader=bloom.compositeMaterial.fragmentShader.replace('uniform float bloomStrength;','uniform float bloomStrength;uniform vec3 uGlowColor;').replace('float bloomAlpha =','bloom = uGlowColor * max(bloom.r,max(bloom.g,bloom.b));\nfloat bloomAlpha =');
  bloom.materialHighPassFilter.uniforms.uChromaMin={value:settings.bloomChromaMin};
  bloom.materialHighPassFilter.fragmentShader=bloom.materialHighPassFilter.fragmentShader.replace('uniform float smoothWidth;','uniform float smoothWidth;uniform float uChromaMin;').replace('float v = luminance( texel.xyz );','float chroma=max(texel.r,max(texel.g,texel.b))-min(texel.r,min(texel.g,texel.b));float v=luminance(texel.xyz)*smoothstep(uChromaMin,uChromaMin+.08,chroma);');
  let groups={ring:0,gap:0,dust:0},placement=new Float32Array(4),center=new Float32Array(3),rings=interlockedRings(0),screenCenter=[0,0];const empty=new Float32Array(32);
  let halfView=Math.tan(settings.cameraFov*Math.PI/360);
  function values(age,trail){return {
   uPlacement:placement,uCenter:center,uRingBasisA:rings.frames[0].basis,uRingBasisB:rings.frames[1].basis,uBeamBasis:bandBasis(rings.pose.direction),uRingRadii:[rings.frames[0].radius,rings.frames[1].radius],uGap:rings.geometry.gap,uFlowSpeed:settings.ringFlowSpeed,uTipFade:settings.ringTipFade,uRingCount:groups.ring,uGapCount:groups.gap,uGapOpacity:settings.gapOpacity,uNeckClearance:rings.geometry.clearanceFraction,uTubeBound:rings.geometry.tube,
   uDustLength:settings.beamDustLength,uDustWaist:settings.beamDustWaist,uDustEndRadius:settings.beamDustEndRadius,uDustSpin:settings.beamDustSpin,uDustFlow:settings.beamDustFlow,uDustOpacity:settings.beamDustOpacity,
   uBandRadius:rings.geometry.radius,uBandThickness:rings.geometry.thickness,uBandHeight:rings.geometry.height,uBandShear:settings.bandShear,uTime:age,uTurbulence:settings.turbulence,uTurbulenceSpeed:settings.turbulenceSpeed,uSpring:settings.spring,uDamping:settings.damping,uAssemblyDelay:settings.assemblyDelay,uAssemblySeconds:settings.assemblySeconds,uAspect:width/height,'uTrail[0]':trail,uRadius:settings.ringPointerRadius/height,uRepulsion:settings.ringPointerForce,uPointerDepth:settings.ringPointerDepth,uPointerSwirl:settings.ringPointerSwirl,uReturnSpread:settings.ringReturnSpread,uCameraDistance:settings.cameraDistance,uCameraHalfHeight:halfView,uScreenCenter:screenCenter};}
  function simulationUniforms(data){gl.useProgram(simulation.program);for(const [name,value]of Object.entries(data)){const u=simulation.u[name];if(u===null)continue;if(typeof value==='number')gl.uniform1f(u,value);else if(value.length===9)gl.uniformMatrix3fv(u,false,value);else if(value.length===32)gl.uniform4fv(u,value);else gl['uniform'+value.length+'fv'](u,value);}}
  function releaseGeometry(){if(!geometry)return;geometry.deleteAttribute('position');geometry.deleteAttribute('velocity');geometry.dispose();geometry=null;state?.dispose();state=null;attributes.clear();}
  function resize(w,h,force=false){
   if(disposed||w<=0||h<=0)return;const coarse=matchMedia('(pointer:coarse)').matches,budget=particleBudget(w,{coarse,memory:navigator.deviceMemory||8});
   const ratio=Math.min(devicePixelRatio||1,settings.maxDpr,Math.sqrt(settings.renderPixelBudget/(w*h)));
   if(!force&&w===width&&h===height&&budget===count&&ratio===dpr)return;
   width=w;height=h;count=budget;dpr=ratio;renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);composer.setPixelRatio(dpr);composer.setSize(w,h);
   const bloomScale=w<=700?settings.bloomMobileResolution:settings.bloomResolution;bloom.setSize(Math.round(canvas.width*bloomScale),Math.round(canvas.height*bloomScale));halfView=Math.tan(settings.cameraFov*Math.PI/360);camera.fov=settings.cameraFov;camera.position.z=settings.cameraDistance;camera.aspect=w/h;camera.updateProjectionMatrix();
   releaseGeometry();renderer.resetState();state=createMeshGpuState(gl,count);renderer.resetState();
   geometry=new THREE.BufferGeometry();geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),10);attribute=new THREE.GLBufferAttribute(state.position,gl.FLOAT,3,4,count);geometry.setAttribute('position',attribute);geometry.setDrawRange(0,count);particles.geometry=geometry;
   groups=singleRing?{ring:count,gap:0,dust:0}:nucleusGroups(count,w,{coarse},settings,interlockedRings(0).geometry.gap);reset=true;lastTime=null;
   placement=new Float32Array([0,0,w<=700?Math.min(.52,w/h*1.04):.82,0]);
   Object.assign(canvas.dataset,{particleEngine:'three-mesh-gpu',particleCount:String(count),ringCount:String(groups.ring),gapCount:String(groups.gap),beamDustCount:String(groups.dust),particleShape:'sphere-impostor',beamMaterial:'CylinderGeometry',camera:'PerspectiveCamera',fov:String(camera.fov),occlusion:'depth-buffer-normal-alpha',pixelRatio:dpr.toFixed(2),bloom:'postprocess-after-depth'});
  }
  function draw(time,progress=0,trail=empty,tilt=[0,0],drive=null){
   if(disposed||!state||gl.isContextLost())return;if(startTime===null)startTime=time;
   const age=time-startTime,elapsed=lastTime===null?0:Math.max(0,time-lastTime),dt=Math.min(1/30,elapsed);lastTime=time;
   const shouldStep=reset||dt>0||age<settings.assemblyDelay+settings.assemblySeconds;
   const offset=tiltOffset(tilt,settings.gyroCorePixels,height),mobile=width<=700;
   screenCenter=singleRing?[0,0]:[(mobile?width/height*.02:width/height*.235)+offset[0],(mobile?.18:.055)+offset[1]];
   camera.setViewOffset(width,height,-screenCenter[0]*height,screenCenter[1]*height,width,height);camera.updateMatrixWorld();
   const ramp=Math.max(0,Math.min(1,age/(settings.assemblyDelay+settings.assemblySeconds))),motion=ramp*ramp*(3-2*ramp);
   rings=interlockedRings(drive?.phase??age,tilt,motion,drive?.extraAngle||0,drive?.rate||1);center=new Float32Array([0,0,rings.pose.depth]);
   const data=values(age,trail);
   if(shouldStep){simulationUniforms({...data,uDt:dt||1/60,uRecycleWindow:Math.max(1/60,Math.min(.2,elapsed))});
    gl.uniform1f(simulation.u.uReset,reset?1:0);state.step();reset=false;renderer.resetState();
   }
   for(const [name,buffer]of [['position',state.position],['velocity',state.velocity]]){if(!attributes.has(buffer))attributes.set(buffer,new THREE.GLBufferAttribute(buffer,gl.FLOAT,3,4,count));geometry.setAttribute(name,attributes.get(buffer));}
   for(const [name,value]of Object.entries(data)){if(uniforms[name])uniforms[name].value=value;}uniforms.uTrail={value:trail};
   uniforms.uBeamBasis.value=new THREE.Matrix3().fromArray(data.uBeamBasis);uniforms.uRingBasisA.value=new THREE.Matrix3().fromArray(data.uRingBasisA);uniforms.uRingBasisB.value=new THREE.Matrix3().fromArray(data.uRingBasisB);
   const colors=beamColors(age,settings);uniforms.uBeamLightColor.value.setRGB(...colors.body);uniforms.uDustColor.value.set(settings.beamDustColor);uniforms.uParticleColor.value.set(settings.particleColor);
   for(const [name,value]of Object.entries({uSphereRadius:mobile?settings.sphereMobileRadius:settings.sphereRadius,uViewportHeight:canvas.height,uDpr:dpr,uLodPixels:mobile?settings.sphereMobileLodPixels:settings.sphereLodPixels,uDofStrength:mobile?settings.sphereMobileDof:settings.sphereDof,uFocusRange:settings.sphereFocusRange,uFocusDistance:settings.cameraDistance-rings.pose.depth,uRingOpacity:settings.ringOpacity,uDiffuse:settings.sphereDiffuse,uAmbient:settings.sphereAmbient,uSpecular:settings.sphereSpecular,uShininess:settings.sphereShininess,uRim:settings.sphereRim,uRimPower:settings.sphereRimPower,uActivityBrightness:settings.ringActivityBrightness}))uniforms[name].value=value;
   uniforms.uResolution.value.set(canvas.width,canvas.height);beamMaterial.uniforms.uColor.value.setRGB(...colors.body);beamMaterial.uniforms.uCoreColor.value.setRGB(...colors.core);beamMaterial.uniforms.uCoreStart.value=settings.beamCoreStart;bloom.compositeMaterial.uniforms.uGlowColor.value.setRGB(...colors.glow);bloom.materialHighPassFilter.uniforms.uChromaMin.value=settings.bloomChromaMin;
   const intro=introState(age),shape=beamMeshPose(rings.pose,placement[2],screenCenter,intro.beam,settings),radius=shape.radius;
   beam.position.set(...shape.center);beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...shape.direction));beam.scale.set(radius,shape.length,radius);beam.visible=intro.beam>.001;for(const m of beamMaterials){const u=m.uniforms;u.uColor.value.setRGB(...colors.body);u.uCoreColor.value.setRGB(...colors.core);for(const [key,value]of Object.entries({uStrength:settings.beamStrength*intro.beam,uTime:age,uPulse:age*settings.beamPulseSpeed,uFresnel:settings.beamFresnel,uNoiseSpeed:settings.beamNoiseSpeed,uNoiseScale:settings.beamNoiseScale,uThicknessWave:settings.beamThicknessWave,uPulseIntensity:settings.beamPulseIntensity,uEnvelopeOpacity:settings.beamEnvelopeOpacity}))u[key].value=value;}
   hotCore.scale.set(settings.beamCoreRadius,1,settings.beamCoreRadius);envelope.scale.set(settings.beamEnvelopeRadius,1,settings.beamEnvelopeRadius);
   uniforms.uBeamViewA.value.set(...shape.endpoints[0]).applyMatrix4(camera.matrixWorldInverse);uniforms.uBeamViewB.value.set(...shape.endpoints[1]).applyMatrix4(camera.matrixWorldInverse);
   bloom.enabled=!debug;bloom.strength=settings.bloomStrength;bloom.radius=settings.bloomRadius;bloom.threshold=settings.bloomThreshold;composer.render();
   const endpoints=shape.endpoints.map(p=>new THREE.Vector3(...p));
   const radii=endpoints.map(p=>radius*canvas.height/(2*halfView*(camera.position.z-p.z)));
   Object.assign(canvas.dataset,{animationTime:age.toFixed(2),particlePhase:intro.text<1?'assembling':'orbiting',beamNearEnd:radii[1]>radii[0]?'superior':'inferior',beamNearRadius:Math.max(...radii).toFixed(3),beamFarRadius:Math.min(...radii).toFixed(3),beamWorldLength:shape.length.toFixed(6),beamWorldRadius:radius.toFixed(6),coreDepth:String(rings.pose.depth),ringRadiusA:String(rings.frames[0].radius),ringRadiusB:String(rings.frames[1].radius),coreScreenCenter:screenCenter.join(','),motionRate:String(drive?.rate||1),motionEnergy:String(drive?.energy||0)});
   if(!fpsStart)fpsStart=performance.now();fpsFrames++;if(performance.now()-fpsStart>1500){canvas.dataset.fps=(fpsFrames*1000/(performance.now()-fpsStart)).toFixed(1);fpsFrames=0;fpsStart=performance.now();}
   return intro;
  }
  const api={resize,draw,async prepare(){
    if(disposed||!state)return;canvas.dataset.gpuReady='preparing';
    draw(0);beam.visible=true;renderer.compile(scene,camera);await renderer.compileAsync(scene,camera);if(disposed)return;
    // Render every composer pass and both external-buffer slots before showing the first frame.
    draw(8);draw(8+1/60);await waitForGpu(gl);if(disposed)return;api.restart();canvas.dataset.animationTime='0';canvas.dataset.gpuReady='ready';
   },restart(){startTime=null;lastTime=null;reset=true;},setDebug(value){debug=value;uniforms.uDebug.value=typeof value==='number'?value:(value?1:0);},
   // Only local test pages call these; production never reads back GPU buffers.
   inspect:inspection?{renderer,scene,camera,beam,particles,composer,bloom,get state(){return state;},get groups(){return groups;}}:undefined,
   async attachDevelopmentPanel(){if(!IS_DEVELOPMENT||gui||disposed)return;const {createParticlePanel}=await import('./particle-panel.js');if(disposed)return;gui=await createParticlePanel();if(disposed)gui?.destroy();},
   dispose(){if(disposed)return;disposed=true;gui?.destroy();releaseGeometry();material.dispose();beamGeometry.dispose();beamMaterials.forEach(m=>m.dispose());bloom.dispose();renderPass.dispose();output.dispose();composer.dispose();resources.dispose();renderer.dispose();if(!gl.isContextLost())renderer.forceContextLoss();}
  };return api;
 }catch(error){state?.dispose();resources?.dispose();renderer?.dispose();console.error('No se pudo crear el núcleo 3D.',error);return null;}
}
