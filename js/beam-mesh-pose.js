import {PARTICLE_CONFIG as config} from './particle-config.js';

export function beamMeshPose(pose,scale,screenCenter=[0,0],growth=1,settings=config){
 const direction=pose.direction,halfView=Math.tan(settings.cameraFov*Math.PI/360),pivot=[0,0,pose.depth];
 const maximum=settings.beamLength*scale*.5;
 // Fit only the tips to the available frame; keep the cylinder radius in world units.
 const extents=[1,-1].map(sign=>{
  const dy=direction[1]*sign,dz=direction[2]*sign,upper=.36-screenCenter[1],lower=-.44-screenCenter[1];let extent=maximum;
  if(dy+upper*2*halfView*dz>0)extent=Math.min(extent,upper*2*halfView*(settings.cameraDistance-pose.depth)/(dy+upper*2*halfView*dz));
  if(-dy-lower*2*halfView*dz>0)extent=Math.min(extent,-lower*2*halfView*(settings.cameraDistance-pose.depth)/(-dy-lower*2*halfView*dz));
  return Math.max(.02,extent)*growth;
 });
 return {pivot,direction,radius:settings.beamWorldRadius*scale,length:extents[0]+extents[1],
  center:pivot.map((p,j)=>p+direction[j]*(extents[0]-extents[1])*.5),
  endpoints:[pivot.map((p,j)=>p-direction[j]*extents[1]),pivot.map((p,j)=>p+direction[j]*extents[0])]};
}
