import test from 'node:test';
import assert from 'node:assert/strict';
import {createParticleSimulation,makeScenePose,locateCursorCore,resolveSphereContact,sculptureDistance,gravityAcceleration} from '../js/particle-physics.js';
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

test('released particles retain inertia, then enter the capture phase and become dormant',()=>{
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


test('gravity is attractive, distance dependent, and finite at the core',()=>{
 const near=gravityAcceleration([1,0,0],[0,0,0]),far=gravityAcceleration([2,0,0],[0,0,0]);
 assert.ok(near[0]<0);assert.ok(Math.abs(near[0]/far[0]-4)<.06);
 assert.deepEqual(gravityAcceleration([0,0,0],[0,0,0]),[0,0,0]);
});

test('gravity sustains an orbit without a prescribed path or a surface spring',()=>{
 const sim=createParticleSimulation({count:1});update(sim,0);sim.active[0]=1;sim.visible[0]=1;
 sim.positions.set([1,0,0]);sim.velocities.set([0,Math.sqrt(.48/Math.pow(1.01,1.5)),0]);
 const core={center:new Float64Array(3),velocity:new Float64Array(3),radius:.06,strength:1};
 let crossed=false;
 for(let frame=0;frame<900;frame++){
  sim.update({dt:1/120,pose,core});const r=Math.hypot(...sim.positions);
  assert.ok(r>.97&&r<1.03);if(sim.positions[0]<-.9)crossed=true;
 }
 assert.equal(crossed,true);assert.equal(sim.active[0],1);
});

test('a stationary cursor and body rotation cannot fracture the solid',()=>{
 const sim=createParticleSimulation({count:3000});let core=null;
 for(let frame=0;frame<90;frame++){
  const currentPose=makeScenePose(frame/30,0,{x:0,y:0,active:0},1280,720);
  core=locateCursorCore(.55,.08,.05,1,currentPose,core,1/30);
  assert.equal(sim.update({dt:1/30,pose:currentPose,core}),0);
 }
 assert.ok(sim.cuts.every(v=>v===0));
});

test('contact chips the surface once, then gravity moves only detached fragments',()=>{
 const sim=createParticleSimulation({count:9000}),core=locateCursorCore(.55,.08,.05,1,pose);
 const count=sim.update({dt:1/30,pose,core,contacts:[{...core,impact:1}],pointer:{velocityX:1}});
 assert.ok(count>0);assert.ok(sim.cuts.some(v=>v!==0));
 const scar=[...sim.cuts],initial=count;
 for(let frame=0;frame<120;frame++)assert.equal(sim.update({dt:1/60,pose,core}),initial);
 assert.deepEqual([...sim.cuts],scar);
 const before=[...sim.positions,...sim.velocities,...sim.cuts];sim.update({dt:.05,pose,core,moving:false});
 assert.deepEqual([...sim.positions,...sim.velocities,...sim.cuts],before);
 for(let frame=0;frame<360;frame++)update(sim);
 assert.equal(sim.hasActive,false);assert.ok(sim.cuts.every(v=>v===0));
});

test('a fast pass releases a larger localized chip than a slow pass',()=>{
 const core=locateCursorCore(.55,.08,.05,1,pose);
 const run=impact=>{const sim=createParticleSimulation({count:9000});return sim.update({dt:1/30,pose,core,contacts:[{...core,impact}],pointer:{velocityX:1}});};
 assert.ok(run(1)>run(0)*1.5);
});

test('capture restores moving source geometry after the cursor leaves',()=>{
 const sim=createParticleSimulation({count:6000}),core=locateCursorCore(.55,.08,.06,1,pose);
 assert.ok(sim.update({dt:1/30,pose,core,contacts:[{...core,impact:.6}]})>0);
 for(let frame=0;frame<300;frame++){
  const currentPose=makeScenePose(frame/30,frame/600,{x:0,y:0,active:0},1280,720);
  sim.update({dt:1/30,pose:currentPose,core:inactiveCore});
 }
 assert.equal(sim.hasActive,false);assert.ok(sim.cuts.every(v=>v===0));
});
