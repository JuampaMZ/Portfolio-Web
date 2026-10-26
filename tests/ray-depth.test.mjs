import test from 'node:test';
import assert from 'node:assert/strict';
import {interlockedRings,beamWorldEndpoints,beamEndpoints,projectPoint} from '../js/particle-motion.js';
import {PARTICLE_CONFIG as config} from '../js/particle-config.js';

test('world radius projects larger at the near tip and reverses ends during the cycle',()=>{
 for(const time of [50,66.67,83.33]){
  const scene=interlockedRings(time),world=beamWorldEndpoints(scene.pose,[.376,.055,1.06,1.6]);
  const radii=world.map(p=>config.beamWorldRadius/(1-p[2]*.38));
  assert.ok(Math.max(...radii)/Math.min(...radii)>1.05);
  assert.equal(radii[0]>radii[1],time===50);
  world.map(projectPoint).forEach(p=>{assert.ok(p[1]<=.380001&&p[1]>=-.450001);});
 }
});

test('both ring planes cross the visible ray in front and behind, with upper rear at rest',()=>{
 const placement=[.376,.055,1.06,1.6];
 for(const time of [50,66.67,83.33]){
  const scene=interlockedRings(time),ends=beamEndpoints(scene.pose,placement),worldEnds=beamWorldEndpoints(scene.pose,placement);
  const d=[ends[2]-ends[0],ends[3]-ends[1]],center=[placement[0]*(1-scene.pose.depth*.38),placement[1]*(1-scene.pose.depth*.38),scene.pose.depth];
  for(const frame of scene.frames){
   const point=angle=>{const x=Math.cos(angle)*frame.radius,z=Math.sin(angle)*frame.radius,m=frame.basis;return [0,1,2].map(j=>center[j]+placement[2]*(m[j]*x+m[j+6]*z));};
   const side=angle=>{const p=projectPoint(point(angle));return (p[0]-ends[0])*d[1]-(p[1]-ends[1])*d[0];};
   const crossings=[];
   for(let i=1;i<=720;i++){
    let lo=(i-1)*Math.PI/360,hi=i*Math.PI/360;if(side(lo)*side(hi)>=0)continue;
    for(let n=0;n<30;n++){const mid=(lo+hi)/2;if(side(lo)*side(mid)<0)hi=mid;else lo=mid;}
    const world=point((lo+hi)/2),p=projectPoint(world),t=((p[0]-ends[0])*d[0]+(p[1]-ends[1])*d[1])/(d[0]*d[0]+d[1]*d[1]);
    const a=(1-t)/(1-worldEnds[0][2]*.38),b=t/(1-worldEnds[1][2]*.38),rayZ=(a*worldEnds[0][2]+b*worldEnds[1][2])/(a+b);
    assert.ok(t>0&&t<1,'crossing stays between the ray tips');
    const front=world[2]>rayZ;crossings.push(front);
    if(time===50)assert.equal(front,p[1]<placement[1],'upper rear and lower front in both planes');
   }
   assert.deepEqual(crossings.sort(),[false,true]);
  }
 }
});
