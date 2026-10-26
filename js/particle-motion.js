import {PARTICLE_CONFIG as config} from './particle-config.js';
export const normalize3=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
export function beamPose(time,tilt=[0,0],blend=1){
 const phase=time*2*Math.PI/Math.max(1,config.beamCycleSeconds);
 const maxSlope=Math.tan(config.beamMaxAngle*Math.PI/180)*blend;
 const gyro=config.gyroMaxTilt*Math.PI/180/Math.max(1,Math.hypot(tilt[0],tilt[1]));
 const direction=normalize3([Math.sin(phase)*maxSlope+tilt[0]*gyro,1,Math.cos(phase)*maxSlope+tilt[1]*gyro]);
 return {direction,depth:Math.sin(phase)*config.beamDepthAmplitude*blend};
}
export function bandBasis(direction){
 const x=normalize3([direction[1],-direction[0],0]);
 const z=[x[1]*direction[2]-x[2]*direction[1],x[2]*direction[0]-x[0]*direction[2],x[0]*direction[1]-x[1]*direction[0]];
 return new Float32Array([...x,...direction,...z]);
}
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Each tube is bounded by a fraction of its distance to the opposite C.
// For any pair of centerline points with distance D, both local distances
// are <= D, so their radii sum to at most 2 * clearanceFraction * D < D.
export function interlockGeometry(settings=config){
 const radius=clamp(settings.bandRadius,.12,.5),thickness=clamp(settings.bandThickness,.012,radius*.32),height=clamp(settings.bandHeight,.012,radius*.32);
 const tube=1.12*Math.max(thickness,height)+Math.min(settings.turbulence,.08)*.2,margin=radius*.008;
 const gap=clamp(settings.ringGapDegrees,15,150)*Math.PI/180,clearanceFraction=clamp(settings.ringClearance,.28,.42);
 const nearest=2*radius*Math.sin(gap/4),clearance=(1-2*clearanceFraction)*nearest-margin;
 const breath=Math.min(Math.max(0,settings.ringBreath),Math.max(0,clearance)*.08);
 const maxRotation=Math.min(3*Math.PI/180,Math.max(0,clearance-2*breath)/(4*(radius+tube+breath)));
 return {radius,thickness,height,tube,gap,margin,breath,maxRotation,clearanceFraction,nearest};
}
export function ringTubeScale(angle,index,geometry){
 const c=Math.cos(angle-index*Math.PI),distance=geometry.radius*Math.sqrt(Math.max(0,2-2*Math.max(c,-c*Math.cos(geometry.gap/2))));
 return Math.min(1,geometry.clearanceFraction*distance/geometry.tube);
}
function limitedRotation(vector,from,to,maxAngle){
 const axis=cross(from,to),length=Math.hypot(...axis);if(length<1e-8)return vector;
 const angle=Math.min(maxAngle,Math.acos(clamp(dot(from,to),-1,1))),n=axis.map(v=>v/length),c=Math.cos(angle),s=Math.sin(angle),nv=dot(n,vector),turn=cross(n,vector);
 return vector.map((v,i)=>v*c+turn[i]*s+n[i]*nv*(1-c));
}
export function interlockedRings(time,tilt=[0,0],blend=1){
 const geometry=interlockGeometry(),pose=beamPose(time,tilt,blend),basis=bandBasis(pose.direction);
 const x=[...basis.slice(0,3)],y=pose.direction,z=[...basis.slice(6,9)],yaw=config.ringOrientation*Math.PI/180;
 const u=x.map((v,i)=>v*Math.cos(yaw)-z[i]*Math.sin(yaw)),side=x.map((v,i)=>v*Math.sin(yaw)+z[i]*Math.cos(yaw));
 const frames=[config.ringLagA,config.ringLagB].map((lag,index)=>{
  const delayed=beamPose(time-Math.max(0,lag),tilt,blend).direction,wobble=Math.min(3,Math.max(0,config.ringWobble))*Math.PI/180*blend;
  const desired=normalize3(delayed.map((v,i)=>v+x[i]*Math.sin(time*.17+index*2.1)*wobble+z[i]*Math.sin(time*.13+index*1.7)*wobble*.7));
  const normal=normalize3(y.map((v,i)=>v+side[i]*(index===0?1:-1)));
  const vectors=[u,normal,cross(u,normal)].map(v=>limitedRotation(v,pose.direction,desired,geometry.maxRotation));
  return {basis:new Float32Array(vectors.flat()),radius:geometry.radius+Math.sin(time*.19+index*2.4)*geometry.breath*blend};
 });
 return {pose,geometry,frames};
}
