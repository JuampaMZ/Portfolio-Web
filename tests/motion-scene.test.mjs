import test from 'node:test';
import assert from 'node:assert/strict';
import {PARTICLE_CONFIG as config} from '../js/particle-config.js';
import {beamPose,bandBasis,beamEndpoints,interlockGeometry,interlockedRings,ringTubeScale} from '../js/particle-motion.js';
import {isMobileSensorDevice,relativeTilt,tiltOffset,createDeviceTilt} from '../js/particle-orientation.js';
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0),distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));

test('hourglass cycle closes smoothly, pivots in depth, and respects its angle bound',()=>{
 const period=config.beamCycleSeconds,a=beamPose(0),b=beamPose(period);
 assert.ok(distance(a.direction,b.direction)<1e-6);assert.ok(Math.abs(a.depth-b.depth)<1e-6);
 let near=false,far=false,left=false,right=false;
 for(let i=0;i<=200;i++){
  const p=beamPose(i/200*period);assert.ok(Math.abs(Math.hypot(...p.direction)-1)<1e-8);
  assert.ok(Math.acos(p.direction[1])*180/Math.PI<=config.beamMaxAngle+.00001);
  near||=p.depth>.1;far||=p.depth<-.1;left||=p.direction[0]<-.2;right||=p.direction[0]>.2;
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
  const placement=[.4,.05,1,0],ends=beamEndpoints(pose,placement),d=[ends[2]-ends[0],ends[3]-ends[1]],to=[placement[0]-ends[0],placement[1]-ends[1]];
  assert.ok(Math.abs(d[0]*to[1]-d[1]*to[0])<1e-6);assert.ok([...ends].every(Number.isFinite));
 }finally{Object.assign(config,previous);}
});
test('both thick C tubes retain clearance across hourglass motion, independent lag, wobble and mobile tilt',()=>{
 let independent=false;
 for(let step=0;step<=72;step++){
  const time=step/72*config.beamCycleSeconds,{pose,geometry:g,frames}=interlockedRings(time,[Math.sin(time*.1),Math.cos(time*.13)]);
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
  assert.ok(g.thickness<=radius*.22);assert.ok(g.height<=radius*.22);
  assert.ok((1-2*g.clearanceFraction)*g.nearest-2*g.breath-2*(radius+g.tube+g.breath)*Math.sin(g.maxRotation)>=g.margin-1e-8);
 }
});

test('sensor detection excludes desktop and orientation is relative, clamped and depth ordered',()=>{
 assert.equal(isMobileSensorDevice({userAgent:'Windows Chrome',maxTouchPoints:10}),false);
 assert.equal(isMobileSensorDevice({userAgent:'iPhone Safari'}),true);assert.equal(isMobileSensorDevice({platform:'MacIntel',maxTouchPoints:5}),true);
 assert.deepEqual(relativeTilt(70,15,{beta:70,gamma:15}),[0,0]);
 const tilted=relativeTilt(80,25,{beta:70,gamma:15});assert.ok(tilted[0]>0&&tilted[1]<0);
 const front=tiltOffset([1,1],config.gyroFrontPixels,800),back=tiltOffset([1,1],config.gyroBackPixels,800);
 assert.ok(Math.hypot(...front)>Math.hypot(...back));assert.ok(Math.hypot(...tiltOffset([4,4],100,800))*800<=config.gyroMaxDisplacement+.001);
});
function event(target,type,props={}){target.dispatchEvent(Object.assign(new Event(type),props));}
function environment(requestPermission,ua='iPhone Safari'){
 const win=new EventTarget();win.DeviceOrientationEvent=typeof requestPermission==='function'?{requestPermission}:{};win.screen={orientation:{angle:0}};
 return {win,nav:{userAgent:ua,userActivation:{isActive:true}},clock:0,now(){return this.clock;}};
}
test('iOS requests only on touch, establishes a holding baseline, smooths samples and cleans listeners',async()=>{
 let requests=0;const env=environment(()=>{requests++;return Promise.resolve('granted');}),sensor=createDeviceTilt({...env,now:()=>env.clock});
 try{
  assert.equal(sensor.status,'awaiting-touch');assert.equal(requests,0);
  event(env.win,'pointerup',{pointerType:'touch'});await Promise.resolve();await Promise.resolve();assert.equal(requests,1);
  event(env.win,'deviceorientation',{beta:73,gamma:12});assert.deepEqual([...sensor.sample()],[0,0]);
  event(env.win,'deviceorientation',{beta:83,gamma:22});env.clock=50;const first=[...sensor.sample()];assert.ok(first[0]>0&&first[0]<.5);
  for(let i=0;i<30;i++){env.clock+=50;sensor.sample();}assert.ok(sensor.sample()[0]>.45);
  event(env.win,'pointerup',{pointerType:'touch'});assert.equal(requests,1);sensor.dispose();event(env.win,'deviceorientation',{beta:0,gamma:0});assert.deepEqual([...sensor.sample()],[0,0]);
 }finally{sensor.dispose();}
});
test('denial, unavailable sensors, Android and desktop retain a safe non-sensor fallback',async()=>{
 let requests=0;const denied=environment(()=>{requests++;return Promise.resolve('denied');}),d=createDeviceTilt({...denied,now:()=>0});
 event(denied.win,'touchend');await Promise.resolve();await Promise.resolve();assert.equal(d.status,'denied');event(denied.win,'touchend');assert.equal(requests,1);assert.deepEqual([...d.sample()],[0,0]);d.dispose();
 const android=environment(null,'Android Chrome'),a=createDeviceTilt({...android,now:()=>0});event(android.win,'deviceorientation',{beta:60,gamma:4});assert.equal(a.status,'active');a.dispose();
 const desktop=environment(()=>{throw new Error('must not ask');},'Windows Chrome'),pc=createDeviceTilt({...desktop,now:()=>0});event(desktop.win,'touchend');assert.equal(pc.status,'desktop');pc.dispose();
 const absent=new EventTarget(),fallback=createDeviceTilt({win:absent,nav:{userAgent:'iPhone'},now:()=>0});assert.equal(fallback.status,'unsupported');fallback.dispose();
});

test('the C opening is 15–20 degrees and the necks preserve the volume away from both crossings',()=>{
 const g=interlockGeometry();assert.ok(g.gap*180/Math.PI>=15&&g.gap*180/Math.PI<=20);
 assert.ok(ringTubeScale(g.gap/2,0,g)<.35);assert.ok(ringTubeScale(Math.PI,0,g)<.35);
 assert.equal(ringTubeScale(Math.PI/2,0,g),1);assert.equal(ringTubeScale(Math.PI*1.5,1,g),1);
});