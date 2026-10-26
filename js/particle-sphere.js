import {cosmicUniforms,cosmicSource} from './big-bang.js';
import {gpuMath} from './particle-gpu.js';
import {orbitalSource} from './orbital-simulation.js';

export const sphereVertex=`
in vec3 velocity;
uniform float uSphereRadius,uViewportHeight,uDpr,uLodPixels,uDofStrength,uFocusRange,uFocusDistance,uDebug,uSingleRing,uTime,uRingOpacity;
uniform vec3 uParticleColor,uDustColor,uBeamViewA,uBeamViewB;
flat out vec3 vCenter,vLight,vHalf,vBase;flat out float vRadius,vOpacity,vDetail,vBlur,vKind,vActivity;
`+gpuMath+cosmicUniforms+orbitalSource+cosmicSource+`
void main(){
 float id=float(gl_VertexID),seed=random(id+1.);bool band=inBand(id),gap=inGap(id),photon=inBeam(id);
 vec4 view=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*view;vCenter=view.xyz;
 if(uSingleRing>.5&&!photon&&(!band||secondRing(id)))gl_Position=vec4(3.,3.,3.,1.);
 float formed=uStoryActive>.5?bangSmooth(uPhases.z,uPhases.w,uBigBang):1.;
 vRadius=uSphereRadius*(.75+seed*.5)*(band?1.:(gap?.32:.28));if(photon)vRadius=uSphereRadius*(.22+seed*.16);
 vRadius=mix(uSphereRadius*(.28+seed*.35),vRadius,formed);
 float diameter=vRadius*uViewportHeight*projectionMatrix[1][1]/max(.05,-view.z);
 vBlur=clamp((abs(-view.z-uFocusDistance)-uFocusRange)/max(.05,uFocusRange),0.,1.)*uDofStrength;
 gl_PointSize=max(photon?2.:1.,diameter*(1.+vBlur)*1.05);vDetail=step(uLodPixels,diameter/uDpr);vKind=photon?3.:(band?0.:(gap?1.:2.));
 vec2 tube=bandTube(id);float density=exp(-dot(tube,tube)*2.2),edge=1.-smoothstep(.65,1.15,length(tube));
 float dust=dustPhase(id,uTime),fade=smoothstep(0.,.045,dust)*(1.-smoothstep(.955,1.,dust));
 vOpacity=band?min(1.,(.65+density*.65)*edge*tipOpacity(id,uTime))*uRingOpacity:(gap?uGapOpacity*tipOpacity(id,uTime):uDustOpacity*(.45+.55*abs(dust*2.-1.))*fade);
 if(photon){float phase=beamPhase(id,uTime);vOpacity=smoothstep(0.,.18,phase)*(1.-smoothstep(.82,1.,phase));vOpacity*=mix(1.,uBeamVariant,formed);}
 if(uStoryActive>.5){float visible=bangSmooth(uPhases.x,uPhases.x+(uPhases.y-uPhases.x)*.28,uBigBang);vOpacity=mix((.25+seed*.55)*visible,vOpacity,formed);}
 vBase=band||gap?uParticleColor:uDustColor;if(photon)vBase=vec3(1.);
 if(uStoryActive>.5){float heat=1.-bangSmooth(uPhases.y,uPhases.z,uBigBang);vBase=mix(vBase,mix(uHotA,uHotB,seed)*(1.+heat*.4),heat);}vActivity=smoothstep(.12,.8,length(velocity));
 vec3 segment=uBeamViewB-uBeamViewA;float along=clamp(dot(view.xyz-uBeamViewA,segment)/max(.00001,dot(segment,segment)),0.,1.);
 vLight=normalize(uBeamViewA+segment*along-view.xyz+vec3(.00001));vHalf=normalize(vLight+normalize(-view.xyz));
 if(vOpacity<.001)gl_Position=vec4(3.,3.,3.,1.);
 if(uDebug>.5&&!photon){vec3 axis=normalize(uBeamBasis[1]);float axial=dot(position-uCenter,axis);vBase=position.z>(uCenter+axis*axial).z?vec3(.95,.05,.025):vec3(.025,.16,1.);}
}`;

export const sphereFragment=`
precision highp float;
flat in vec3 vCenter,vLight,vHalf,vBase;flat in float vRadius,vOpacity,vDetail,vBlur,vKind,vActivity;
uniform mat4 uProjection,uInverseProjection;uniform vec2 uResolution;
uniform vec3 uBeamLightColor,uBeamViewA,uBeamViewB;uniform float uDebug,uDiffuse,uAmbient,uSpecular,uShininess,uRim,uRimPower,uActivityBrightness;
out vec4 outColor;
void main(){
 if(vKind>2.5){vec2 p=gl_PointCoord*2.-1.;float r=dot(p,p);if(r>1.)discard;float alpha=exp(-r*3.2)*vOpacity;gl_FragDepth=gl_FragCoord.z;outColor=vec4(vBase*(3.8+vActivity*.3),alpha);return;}
 vec2 ndc=gl_FragCoord.xy/uResolution*2.-1.;vec4 farPoint=uInverseProjection*vec4(ndc,1.,1.);vec3 ray=normalize(farPoint.xyz/farPoint.w);
 float along=dot(ray,vCenter),radius2=vRadius*vRadius,disc=along*along-dot(vCenter,vCenter)+radius2;
 if(disc<=0.){
  if(vBlur<.001||disc<radius2*(1.-pow(1.+vBlur,2.)))discard;
  float halo=exp(disc/(radius2*max(.01,vBlur)*.6))*.09*vOpacity;
  if(halo<.006)discard;gl_FragDepth=1.;outColor=vec4(vBase,halo);return;
 }
 float distance=along-sqrt(disc);if(distance<=0.)discard;vec3 hit=ray*distance,N=normalize(hit-vCenter),V=normalize(-hit);
 vec4 clip=uProjection*vec4(hit,1.);gl_FragDepth=clamp(clip.z/clip.w*.5+.5,0.,1.);
 // Local GPU tests encode the actual sphere-surface depth; production never enables this mode.
 if(uDebug>1.5){float n=floor(gl_FragDepth*16777215.+.5);outColor=vec4(floor(n/65536.),mod(floor(n/256.),256.),mod(n,256.),255.)/255.;return;}
 float coverage=smoothstep(0.,max(fwidth(disc)*1.2,radius2*.005),disc),alpha=vOpacity*coverage;if(alpha<.018)discard;
 if(uDebug>.5){vec3 axis=uBeamViewB-uBeamViewA;float dr=dot(ray,axis),t=clamp((dr*dot(ray,uBeamViewA)-dot(axis,uBeamViewA))/max(.000001,dot(axis,axis)-dr*dr),0.,1.);float axisDepth=(uBeamViewA+axis*t).z;outColor=vec4(hit.z>axisDepth?vec3(.95,.05,.025):vec3(.025,.16,1.),alpha);return;}
 float diffuse=max(dot(N,vLight),0.),facing=max(dot(N,V),0.);
 vec3 tint=mix(vec3(1.),uBeamLightColor,uDiffuse*.65*diffuse);
 vec3 light=vBase*tint*(uAmbient+uDiffuse*diffuse);
 if(vKind<.5){
  float spec=vDetail>.5?pow(max(dot(N,vHalf),0.),uShininess)*uSpecular:pow(max(dot(N,vHalf),0.),12.)*uSpecular*.15;
  float rim=pow(1.-facing,uRimPower)*uRim*(vDetail>.5?1.:.45);
  light+=vec3(spec+rim);light*=1.+vActivity*uActivityBrightness;
 }else light=mix(vBase,uBeamLightColor,.22)*(.8+.2*diffuse);
 // DOF remains small: soften highlight and edge, while retaining the true sphere surface depth.
 light=mix(light,vBase*.85,vBlur*.30);alpha*=1.-vBlur*.12;
 outColor=vec4(light,alpha);
}`;
