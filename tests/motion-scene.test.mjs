import test from 'node:test';
import assert from 'node:assert/strict';
import {PARTICLE_CONFIG as config} from '../js/particle-config.js';
import {beamPose,bandBasis,beamEndpoints,projectPoint} from '../js/particle-motion.js';
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
test('the band plane stays perpendicular to the delayed beam and has a stable projected pivot',()=>{
 const t=8,p=beamPose(t),lagged=beamPose(t-config.bandLag),m=bandBasis(lagged.direction);
 const x=[...m.slice(0,3)],y=[...m.slice(3,6)],z=[...m.slice(6,9)];
 assert.ok(Math.abs(dot(x,y))<1e-6&&Math.abs(dot(y,z))<1e-6&&Math.abs(dot(x,z))<1e-6);
 assert.ok(dot(y,lagged.direction)>.99999);assert.ok(distance(lagged.direction,p.direction)>.001);
 const placement=[.4,.05,1,0],ends=beamEndpoints(p,placement),d=[ends[2]-ends[0],ends[3]-ends[1]],to=[placement[0]-ends[0],placement[1]-ends[1]];
 assert.ok(Math.abs(d[0]*to[1]-d[1]*to[0])<1e-6);assert.ok([...ends].every(Number.isFinite));
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
