import test from 'node:test';import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3,CylinderGeometry} from 'three';
import {interlockedRings} from '../js/particle-motion.js';
import {beamMeshPose} from '../js/beam-mesh-pose.js';
import {PARTICLE_CONFIG as config} from '../js/particle-config.js';
const camera=new PerspectiveCamera(config.cameraFov,1.6,.04,12);camera.position.z=config.cameraDistance;camera.updateMatrixWorld();
const project=p=>new Vector3(...p).project(camera);
test('real perspective makes the constant-radius cylinder wider at the near end and swaps ends',()=>{
 assert.ok(camera.isPerspectiveCamera&&camera.fov>=40&&camera.fov<=55);
 const cylinder=new CylinderGeometry(1,1,1,48,20);assert.equal(cylinder.parameters.radiusTop,cylinder.parameters.radiusBottom);cylinder.dispose();
 for(const time of [50,58,75]){
  const shape=beamMeshPose(interlockedRings(time).pose,.82),radii=shape.endpoints.map(p=>shape.radius/(config.cameraDistance-p[2]));
  assert.ok(Math.max(...radii)/Math.min(...radii)>1.1);assert.equal(radii[1]>radii[0],time!==75);
  assert.equal(shape.radius,config.beamWorldRadius*.82);assert.equal(shape.length,config.beamLength*.82);shape.endpoints.forEach(p=>assert.ok(Number.isFinite(project(p).y)));
 }
});
test('both ring planes cross the cylinder in front and behind under the new camera',()=>{
 for(const time of [50,58,75])for(const boost of [0,config.scrollExtraAngle]){
  const scene=interlockedRings(time,[0,0],1,boost),shape=beamMeshPose(scene.pose,.82),c=project(shape.pivot),v=project(shape.pivot.map((p,j)=>p+shape.direction[j]*.1)),d=[v.x-c.x,v.y-c.y];
  for(const frame of scene.frames){
   const point=a=>[0,1,2].map(j=>shape.pivot[j]+.82*frame.radius*(frame.basis[j]*Math.cos(a)+frame.basis[j+6]*Math.sin(a)));
   const side=a=>{const p=project(point(a));return(p.x-c.x)*d[1]-(p.y-c.y)*d[0];};const crossings=[];
   for(let i=1;i<=720;i++){let lo=(i-1)*Math.PI/360,hi=i*Math.PI/360;if(side(lo)*side(hi)>=0)continue;for(let n=0;n<30;n++){const mid=(lo+hi)/2;if(side(lo)*side(mid)<0)hi=mid;else lo=mid;}
    const p=point((lo+hi)/2),q=project(p),along=q.y*Math.tan(config.cameraFov*Math.PI/360)*(config.cameraDistance-scene.pose.depth)/(shape.direction[1]+q.y*Math.tan(config.cameraFov*Math.PI/360)*shape.direction[2]);
    const max=Math.max(...shape.endpoints.map(x=>x[1])),min=Math.min(...shape.endpoints.map(x=>x[1]));assert.ok(along*shape.direction[1]>=min-.001&&along*shape.direction[1]<=max+.001);
    const front=p[2]>scene.pose.depth+along*shape.direction[2];crossings.push(front);if(time===50)assert.equal(front,q.y<0);
   }
   assert.deepEqual(crossings.sort(),[false,true]);
  }
 }
});
