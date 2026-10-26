import {cosmicUniforms,cosmicSource} from './big-bang.js';
import {gpuMath} from './particle-gpu.js';
// Axial hourglass restored verbatim from 7b12045; rendering uses the new camera.
export const orbitalSource=`
uniform vec4 uPlacement;uniform float uCameraDistance,uCameraHalfHeight,uPointerDepth,uPointerSwirl,uReturnSpread;uniform vec2 uScreenCenter;uniform vec3 uCenter;uniform mat3 uRingBasisA,uRingBasisB,uBeamBasis;uniform vec2 uRingRadii;
uniform float uRingCount,uGapCount,uGapOpacity,uNeckClearance,uTubeBound;
uniform float uDustLength,uDustWaist,uDustEndRadius,uDustSpin,uDustFlow,uDustOpacity;
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
float tipScale(float phase){
 float angle=uGap*.5+phase*(6.2831853-uGap),c=cos(angle);
 float distance=uBandRadius*sqrt(max(0.,2.-2.*max(c,-c*cos(uGap*.5))));
 return min(1.,uNeckClearance*distance/uTubeBound);
}
float dustPhase(float id,float time){
 float direction=random(id+43.)>.5?1.:-1.;
 return fract(random(id+23.)+time*uDustFlow/max(.2,uDustLength)*direction);
}
vec3 beamDustLocal(float id,float time){
 float phase=dustPhase(id,time),axial=phase*2.-1.;
 float cone=(sqrt(axial*axial+.0025)-.05)/.95124922;
 float envelope=mix(uDustWaist,uDustEndRadius,cone);
 float radius=envelope*(.48+.52*sqrt(random(id+31.)));
 float angle=random(id+4.)*6.2831853+time*uDustSpin*(.9+random(id+17.)*.2)+axial*3.92699082;
 return vec3(cos(angle)*radius,axial*uDustLength*.5,sin(angle)*radius);
}
vec3 orbitalTarget(float id,float time){
 if(inBeam(id))return beamPhoton(id,time);vec3 p;
 if(inBand(id)||inGap(id)){
  bool second=secondRing(id),gap=inGap(id);vec2 tube=bandTube(id);float phase=ringPhase(id,time);
  float angle=(second?3.14159265:0.)+(gap?-uGap*.5:uGap*.5)+phase*(gap?uGap:6.2831853-uGap);
  float taper=gap?.025:tipScale(phase),radius=(second?uRingRadii.y:uRingRadii.x)+tube.x*uBandThickness*taper;
  p=vec3(cos(angle)*radius,tube.y*uBandHeight*taper,sin(angle)*radius);
  p+=curlNoise(p*8.,time*uTurbulenceSpeed*.52)*min(uTurbulence,.08)*.10*taper;
  p=(second?uRingBasisB:uRingBasisA)*p;
 }else p=uBeamBasis*beamDustLocal(id,time);
 return p*uPlacement.z+uCenter;
}
vec3 nucleusPointer(vec3 p,float id){
 float viewHeight=uCameraHalfHeight*2.*max(.1,uCameraDistance-p.z);vec2 screen=p.xy/viewHeight+uScreenCenter;vec3 force=vec3(0.);float total=0.,seed=random(id+77.);
 for(int i=0;i<8;i++){
  if(uTrail[i].z<.004)continue;vec2 away=screen-uTrail[i].xy;float distance=length(away),reach=max(.0001,uRadius*uTrail[i].w);if(distance>=reach)continue;
  float falloff=pow(1.-smoothstep(0.,reach,distance),2.)*uTrail[i].z;
  float wave=.75+.25*sin(distance/reach*9.-(1.-uTrail[i].z)*8.+seed*6.2831853);
  vec2 direction=normalize(away+vec2(.00001,0.)),tangent=vec2(-direction.y,direction.x);
  float depth=(seed>.5?1.:-1.)*(.65+.35*sin(seed*12.+p.y*13.));
  force+=vec3((direction+tangent*uPointerSwirl)*viewHeight,depth*uPointerDepth)*falloff*wave*uRepulsion;total+=falloff;
 }return force/max(1.,total);
}
`;
export const simulationVertex=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;layout(location=1) in vec3 aVelocity;
uniform float uTime,uDt,uReset,uSpring,uDamping,uAspect,uRecycleWindow;
out vec3 nextPosition,nextVelocity;
`+gpuMath+cosmicUniforms+orbitalSource+cosmicSource+`
void main(){
 float id=float(gl_VertexID),seed=random(id+1.);
 vec3 target=orbitalTarget(id,uTime);
 bool wrapped=inBeam(id)?abs(beamPhase(id,uTime)-beamPhase(id,uTime-uRecycleWindow))>.5:((inBand(id)||inGap(id))?abs(ringPhase(id,uTime)-ringPhase(id,uTime-uRecycleWindow))>.5:abs(dustPhase(id,uTime)-dustPhase(id,uTime-uRecycleWindow))>.5);
 if(uStoryActive>.5&&uBigBang<1.){
  target=cosmicTarget(id,uBigBang,uVisualTime,target);float inertia=bangSmooth(uPhases.w,1.,uBigBang);
  float spring=uSpring*mix(1.-uReturnSpread*.7,1.+uReturnSpread*.3,random(id+83.));vec3 force=(target-aPosition)*spring-aVelocity*uDamping+nucleusPointer(aPosition,id)*inertia;
  vec3 v=aVelocity+force*uDt;v*=min(1.,4./max(length(v),.0001));nextPosition=uReset>.5?target:mix(target,aPosition+v*uDt,inertia);
  nextVelocity=uReset>.5?vec3(0.):mix((nextPosition-aPosition)/max(.001,uDt),v,inertia);nextVelocity*=min(1.,4./max(length(nextVelocity),.0001));
 }else if(uReset>.5||wrapped){nextPosition=target;nextVelocity=vec3(0.);}
 else{
  float spring=uSpring*mix(1.-uReturnSpread*.7,1.+uReturnSpread*.3,random(id+83.)),damping=uDamping*mix(.84,1.13,random(id+89.));
  vec3 force=(target-aPosition)*spring-aVelocity*damping+nucleusPointer(aPosition,id);nextVelocity=aVelocity+force*uDt;nextVelocity*=min(1.,4./max(length(nextVelocity),.0001));nextPosition=aPosition+nextVelocity*uDt;
 }
 gl_Position=vec4(0.);
}`;
