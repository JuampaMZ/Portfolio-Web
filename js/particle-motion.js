import {PARTICLE_CONFIG as config} from './particle-config.js';
export const normalize3=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
export function beamPose(time,tilt=[0,0],blend=1){
 const phase=time*2*Math.PI/Math.max(1,config.beamCycleSeconds)+Math.PI*.5;
 const maxSlope=Math.tan(config.beamMaxAngle*Math.PI/180)*blend;
 const gyro=config.gyroMaxTilt*Math.PI/180/Math.max(1,Math.hypot(tilt[0],tilt[1]));
 const direction=normalize3([Math.sin(phase)*maxSlope+tilt[0]*gyro,1,Math.cos(phase)*Math.min(maxSlope,config.beamDepthAmplitude*.85)+tilt[1]*gyro]);
 return {direction,depth:Math.cos(phase)*config.beamDepthAmplitude*blend};
}
export function bandBasis(direction){
 const x=normalize3([direction[1],-direction[0],0]);
 const z=[x[1]*direction[2]-x[2]*direction[1],x[2]*direction[0]-x[0]*direction[2],x[0]*direction[1]-x[1]*direction[0]];
 return new Float32Array([...x,...direction,...z]);
}
export function projectPoint(p){const scale=1/Math.max(.55,1-p[2]*.38);return [p[0]*scale,p[1]*scale];}
export function beamEndpoints(pose,placement,growth=1){
 const center=[placement[0]*(1-pose.depth*.38),placement[1]*(1-pose.depth*.38),pose.depth],extent=placement[2]*.49*growth;
 const a=projectPoint(center.map((v,i)=>v+pose.direction[i]*extent)),b=projectPoint(center.map((v,i)=>v-pose.direction[i]*extent));
 return new Float32Array([...a,...b]);
}
