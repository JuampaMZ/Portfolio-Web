import test from 'node:test';import assert from 'node:assert/strict';
import {createAnimationClock} from '../js/animation-clock.js';import {createScrollDrive} from '../js/scroll-drive.js';
import {PARTICLE_CONFIG as config} from '../js/particle-config.js';import {beamPose,interlockedRings} from '../js/particle-motion.js';import {beamMeshPose} from '../js/beam-mesh-pose.js';
test('visible clock uses real elapsed time, even through a slow frame; only a hidden tab pauses it',()=>{
 const c=createAnimationClock();assert.equal(c.sample(100),0);assert.equal(c.sample(116),.016);assert.equal(c.sample(400),.3);
 c.pause(500);assert.equal(c.sample(2000),.4);c.resume(2500);assert.equal(c.sample(2600),.5);c.reset();assert.equal(c.sample(9000),0);
});
test('scroll accelerates phase without reversal, adds bounded tilt and eases back to autonomous speed',()=>{
 const c=createScrollDrive(config);let p=c.step(0,0),before=0;
 for(let i=1;i<=60;i++){c.input(40,i*16.667,800);p=c.step(i*16.667,1/60);assert.ok(p.phase>before);before=p.phase;}
 assert.ok(p.rate>2&&p.extraAngle>5&&p.extraAngle<=config.scrollExtraAngle);const peak=p.energy;
 p=c.step(1100,1/60);assert.ok(p.energy>peak*.9); // no sudden stop
 for(let i=1;i<=600;i++)p=c.step(1100+i*16.667,1/60);
 assert.ok(p.rate<1.002&&p.extraAngle<.01);
});
test('all ring radii, beam length, thickness and pivot are invariant across the cycle and scroll boost',()=>{
 for(const time of [0,6.25,12.5,25,50,58,75])for(const extra of [0,config.scrollExtraAngle]){
  const rings=interlockedRings(time,[0,0],1,extra,3.6),shape=beamMeshPose(rings.pose,.82,[.3,.1]);
  assert.equal(rings.pose.depth,0);assert.deepEqual(shape.center,[0,0,0]);assert.equal(shape.length,config.beamLength*.82);assert.equal(shape.radius,config.beamWorldRadius*.82);
  assert.ok(rings.frames.every(f=>f.radius===config.bandRadius));assert.ok(Math.abs(Math.hypot(...shape.endpoints[0].map((v,i)=>v-shape.endpoints[1][i]))-shape.length)<1e-10);
 }
 const a=beamPose(0),b=beamPose(25);assert.ok(a.direction[2]>.6&&b.direction[2]<-.6);
});
