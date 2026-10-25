import test from 'node:test';
import assert from 'node:assert/strict';
import {createParticleSimulation,makeScenePose,locateCursorCore,resolveSphereContact,sculptureDistance} from '../js/particle-physics.js';
const pose=makeScenePose(0,0,{x:0,y:0,active:0},1280,720);
const empty=new Float32Array(20),impacts=new Float32Array(5);
const inactiveCore={center:new Float64Array([100,100,100]),velocity:new Float64Array(3),radius:.2,strength:0};
const update=(sim,dt=1/60,moving=true)=>sim.update({dt,pose,core:inactiveCore,touches:empty,impacts,moving});

test('irregular surface samples match the sculpture and reproduce only for the same seed',()=>{
 const a=createParticleSimulation({count:200,seed:41}),b=createParticleSimulation({count:200,seed:41}),c=createParticleSimulation({count:200,seed:42});
 update(a,0);update(b,0);update(c,0);
 assert.deepEqual([...a.targets],[...b.targets]);assert.notDeepEqual([...a.targets],[...c.targets]);
 for(let index=0;index<a.count;index++){const o=index*3;assert.ok(sculptureDistance(a.targets[o],a.targets[o+1],a.targets[o+2],pose)<.003);}
});

test('cursor core is located on the original 3D surface',()=>{
 const core=locateCursorCore(.55,.08,.08,1,pose);
 assert.equal(core.hit,true);assert.ok(Math.abs(sculptureDistance(...core.center,pose))<.005);
 assert.ok(core.radius>0&&Number.isFinite(core.radius));
});

test('sphere collisions preserve state and reverse incoming velocity with energy loss',()=>{
 const p=new Float32Array([.4,0,0]),v=new Float32Array([-2,.5,0]);
 assert.equal(resolveSphereContact(p,v,0,[0,0,0],[0,0,0],1,.6),true);
 assert.ok(p[0]>=1);assert.ok(v[0]>1.19&&v[0]<1.21);assert.ok(v[1]<.5);
 assert.ok(Math.hypot(...v)<Math.hypot(-2,.5,0));
 const center=new Float32Array(3),zero=new Float32Array(3);
 resolveSphereContact(center,zero,0,[0,0,0],[0,0,0],1,.6);
 assert.ok([...center,...zero].every(Number.isFinite));
});

test('released particles retain inertia, then return elastically and become dormant',()=>{
 const sim=createParticleSimulation({count:1});update(sim,0);
 const target=sim.targets[0];sim.active[0]=1;sim.visible[0]=1;sim.positions[0]=target+.3;sim.velocities[0]=1;
 update(sim);assert.ok(sim.positions[0]>target+.3);assert.notEqual(sim.velocities[0],0);
 for(let frame=0;frame<300;frame++)update(sim);
 assert.ok(Math.abs(sim.positions[0]-sim.targets[0])<.01);assert.equal(sim.active[0],0);
});

test('integration is stable across render rates and pause freezes position and velocity',()=>{
 const make=()=>{const sim=createParticleSimulation({count:1});update(sim,0);sim.active[0]=1;sim.visible[0]=1;sim.positions[0]+=.3;sim.velocities[1]=.4;return sim;};
 const a=make(),b=make();for(let frame=0;frame<30;frame++)update(a,1/30);for(let frame=0;frame<60;frame++)update(b,1/60);
 for(let axis=0;axis<3;axis++)assert.ok(Math.abs(a.positions[axis]-b.positions[axis])<.00001);
 const before=[...a.positions,...a.velocities];update(a,.05,false);assert.deepEqual([...a.positions,...a.velocities],before);
});

test('persistent core excludes physical particles over repeated integration steps',()=>{
 const sim=createParticleSimulation({count:1});update(sim,0);sim.active[0]=1;sim.visible[0]=1;
 sim.positions.set([.05,0,0]);sim.velocities.set([-1,0,0]);
 const core={center:new Float64Array(3),velocity:new Float64Array(3),radius:.2,strength:1};
 for(let frame=0;frame<120;frame++){
  sim.update({dt:1/60,pose,core,touches:empty,impacts});
  assert.ok(Math.hypot(...sim.positions)>=.203);
  assert.ok([...sim.positions,...sim.velocities].every(Number.isFinite));
 }
});

test('a moving sculpture fully absorbs a released group without leaving permanent fragments',()=>{
 const sim=createParticleSimulation({count:6000,maxActive:1200});let core=null,draw=0;
 const burst=new Float32Array([.55,.08,1,.18,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
 for(let frame=0;frame<210;frame++){
  const currentPose=makeScenePose(frame/30,0,{x:0,y:0,active:0},1280,720),on=frame<25;
  core=locateCursorCore(.55,.08,.08,on?1:0,currentPose,core,1/30);
  draw=sim.update({dt:1/30,pose:currentPose,core,touches:on?burst:empty,impacts});
 }
 assert.equal(draw,0);assert.equal(sim.hasActive,false);
});
