import test from 'node:test';
import assert from 'node:assert/strict';
import {PARTICLE_CONFIG as config} from '../js/particle-config.js';
import {beamPose,bandBasis,interlockGeometry,interlockedRings,ringTubeScale} from '../js/particle-motion.js';
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0),distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));

test('hourglass cycle closes smoothly, pivots in depth, and respects its angle bound',()=>{
 const period=config.beamCycleSeconds,a=beamPose(0),b=beamPose(period);
 assert.ok(distance(a.direction,b.direction)<1e-6);assert.ok(Math.abs(a.depth-b.depth)<1e-6);
 let near=false,far=false,left=false,right=false;
 for(let i=0;i<=200;i++){
  const p=beamPose(i/200*period);assert.ok(Math.abs(Math.hypot(...p.direction)-1)<1e-8);
  assert.ok(Math.acos(p.direction[1])*180/Math.PI<=config.beamMaxAngle+.00001);
  assert.equal(p.depth,0);near||=p.direction[2]>.4;far||=p.direction[2]<-.4;left||=p.direction[0]<-.2;right||=p.direction[0]>.2;
 }
 assert.ok(near&&far&&left&&right);
 const e=.0001,l=beamPose(period-e),r=beamPose(e);assert.ok(distance(l.direction,r.direction)<.001);
});
test('the beam pivot remains stable and its axis bisects the two nominal perpendicular planes',()=>{
 const previous={ringLagA:config.ringLagA,ringLagB:config.ringLagB,ringWobble:config.ringWobble,ringBreath:config.ringBreath};
 try{
  Object.assign(config,{ringLagA:0,ringLagB:0,ringWobble:0,ringBreath:0});
  const {pose,frames}=interlockedRings(8),normals=frames.map(f=>[...f.basis.slice(3,6)]);
  assert.ok(Math.abs(dot(normals[0],normals[1]))<1e-6);
  const sum=normals[0].map((v,i)=>(v+normals[1][i])/Math.SQRT2);assert.ok(distance(sum,pose.direction)<1e-6);
 }finally{Object.assign(config,previous);}
});
test('both thick C tubes retain clearance across hourglass motion, independent lag and bounded wobble',()=>{
 let independent=false;
 for(let step=0;step<=72;step++){
  const time=step/72*config.beamCycleSeconds,{pose,geometry:g,frames}=interlockedRings(time);
  const points=frames.map((frame,index)=>{
   const u=[...frame.basis.slice(0,3)],n=[...frame.basis.slice(3,6)],v=[...frame.basis.slice(6,9)];
   assert.ok(Math.abs(dot(u,n))<1e-6&&Math.abs(dot(v,n))<1e-6);
   assert.ok(Math.abs(dot(n,pose.direction))*frame.radius>g.tube+.06,'The beam clears each thick tube');
   return Array.from({length:85},(_,i)=>{const a=index*Math.PI+g.gap/2+i/84*(2*Math.PI-g.gap);return {position:u.map((x,j)=>(x*Math.cos(a)+v[j]*Math.sin(a))*frame.radius),tube:g.tube*ringTubeScale(a,index,g)};});
  });
  const normalA=[...frames[0].basis.slice(3,6)],normalB=[...frames[1].basis.slice(3,6)];
  independent||=Math.abs(dot(normalA,normalB))>.0001;
  let closest=Infinity;for(const a of points[0])for(const b of points[1])closest=Math.min(closest,distance(a.position,b.position)-a.tube-b.tube);
  assert.ok(closest>g.margin,'The tapered tube clears the opposite C throughout its full thickness');
 }
 assert.ok(independent,'Each ring has its own bounded motion');
});
test('local necks retain clearance at narrow openings and limit excessive tube and wobble settings',()=>{
 for(const radius of [.18,.3,.4]){
  const g=interlockGeometry({...config,bandRadius:radius,bandThickness:.14,bandHeight:.14,ringGapDegrees:15,ringBreath:.1});
  assert.ok(g.thickness<=radius*.32);assert.ok(g.height<=radius*.32);
  assert.ok((1-2*g.clearanceFraction)*g.nearest-2*g.breath-2*(radius+g.tube+g.breath)*Math.sin(g.maxRotation)>=g.margin-1e-8);
 }
});

test('the C opening adjusts to the 40% wider bands and the necks preserve the volume away from both crossings',()=>{
 const g=interlockGeometry();assert.ok(g.gap*180/Math.PI>=23&&g.gap*180/Math.PI<=27);
 assert.ok(ringTubeScale(g.gap/2,0,g)<.35);assert.ok(ringTubeScale(Math.PI,0,g)<.35);
 assert.equal(ringTubeScale(Math.PI/2,0,g),1);assert.equal(ringTubeScale(Math.PI*1.5,1,g),1);
});
