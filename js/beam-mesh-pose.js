import {PARTICLE_CONFIG as config} from './particle-config.js';

export function beamMeshPose(pose,scale,screenCenter=[0,0],growth=1,settings=config){
 // The viewport fixes this scale once; neither orientation, scroll nor intro resizes the ray.
 const direction=pose.direction,pivot=[0,0,0],length=settings.beamLength*scale;
 return {pivot,direction,radius:settings.beamWorldRadius*scale,length,center:[...pivot],
  endpoints:[pivot.map((p,j)=>p-direction[j]*length*.5),pivot.map((p,j)=>p+direction[j]*length*.5)]};
}
