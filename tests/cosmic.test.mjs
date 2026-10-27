import test from 'node:test';import assert from 'node:assert/strict';
import {PARTICLE_CONFIG as c} from '../js/particle-config.js';
import {qualityProfile} from '../js/render-quality.js';import {bigBangState,bangPhases,createBangProgress} from '../js/big-bang.js';
import {interlockedRings} from '../js/particle-motion.js';import {beamMeshPose} from '../js/beam-mesh-pose.js';
import fs from 'node:fs';
const cap={webgl2:true,rgba8:true,hdr:true,precision:23,feedback:4,maxSize:4096};
test('quality uses tested framebuffer renderability and safely avoids HDR when unavailable',()=>{
 const high=qualityProfile(cap,390,{},c),ldr=qualityProfile({...cap,hdr:false},390,{},c),low=qualityProfile(cap,390,{forceLow:true},c);
 assert.equal(high.hdr,true);for(const p of [ldr,low]){assert.equal(p.hdr,false);assert.equal(p.bloomStrength,0);assert.ok(p.coreCount<high.coreCount&&p.pixelBudget<high.pixelBudget);}
 for(const unsupported of [{...cap,webgl2:false},{...cap,rgba8:false},{...cap,precision:10},{...cap,feedback:1}])assert.equal(qualityProfile(unsupported,390,{},c).fallback,true);
 assert.equal(qualityProfile(cap,390,{memory:2},c).hdr,false);
});
test('desktop radius and ring count increase together by 18%, with mobile dimensions unchanged',()=>{
 const desktop=qualityProfile(cap,1280,{},c),mobile=qualityProfile(cap,390,{},c);assert.ok(desktop.ringScale>=1.15&&desktop.ringScale<=1.2);assert.equal(mobile.ringScale,1);
 assert.equal(desktop.coreCount,Math.round((c.count-c.beamDustCount)*c.desktopRingScale+c.beamDustCount));assert.ok(mobile.maxDpr<=2&&mobile.pixelBudget<desktop.pixelBudget);
});
test('Big Bang phases overlap continuously, reveal the sky before the hero and are reversible',()=>{
 const p=bangPhases(c);assert.deepEqual(p,[.1,.3,.6,.9]);assert.equal(bigBangState(.05,c).phase,'singularity');assert.equal(bigBangState(.2,c).phase,'explosion');assert.equal(bigBangState(.45,c).phase,'expansion');assert.equal(bigBangState(.75,c).phase,'absorption');assert.equal(bigBangState(1,c).phase,'formed');
 assert.equal(bigBangState(.05,c).visible,0);assert.equal(bigBangState(.3,c).background,0);assert.equal(bigBangState(.9,c).text,0);assert.equal(bigBangState(1,c).text,1);
 const drive=createBangProgress(c);let previous=0;for(let i=0;i<150;i++){const value=drive.step(1,1/60);assert.ok(value>=previous&&value<=1);previous=value;}assert.equal(previous,1);
 for(let i=0;i<150;i++){const value=drive.step(0,1/60);assert.ok(value<=previous&&value>=0);previous=value;}assert.equal(previous,0);
});
test('both mobile viewports fit ray endpoints and the C volumes throughout the cycle',()=>{
 for(const [w,h]of [[390,844],[412,915],[375,667]]){const scale=Math.min(.44,w/h*.78),half=Math.tan(c.cameraFov*Math.PI/360),aspect=w/h;
  const project=p=>[p[0]/(2*half*(c.cameraDistance-p[2]))+aspect*.02,p[1]/(2*half*(c.cameraDistance-p[2]))+.18];
  for(let step=0;step<48;step++){const rings=interlockedRings(step/48*c.beamCycleSeconds,[0,0],1,c.scrollExtraAngle,3.6),shape=beamMeshPose(rings.pose,scale);
   const all=[...shape.endpoints];for(const f of rings.frames)for(let i=0;i<36;i++){const a=i*Math.PI/18;for(const offset of [-1,1])all.push([0,1,2].map(j=>scale*((f.radius+offset*c.bandThickness)*(f.basis[j]*Math.cos(a)+f.basis[j+6]*Math.sin(a))+offset*c.bandHeight*f.basis[j+3])));}
   for(const p of all){const q=project(p);assert.ok(Math.abs(q[0])<aspect*.5&&Math.abs(q[1])<.5,`${w}x${h}: ${q}`);}
  }
 }
});
test('runtime contains no sensor API, sensor permissions or large fallback logo',()=>{
 for(const name of fs.readdirSync('js').filter(n=>n.endsWith('.js'))){const source=fs.readFileSync('js/'+name,'utf8');assert.ok(!/DeviceOrientationEvent|requestPermission|gyro/i.test(source),name);}
 assert.ok(!fs.readFileSync('index.html','utf8').includes('cinema-fallback" aria-hidden="true"><img'));
});
