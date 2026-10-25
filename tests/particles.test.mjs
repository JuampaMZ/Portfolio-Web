import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleShapePixels} from '../js/particle-shape.js';
import {particleBudget,PARTICLE_CONFIG} from '../js/cinema-renderer.js';

const image={width:3,height:2,data:new Uint8ClampedArray([
 0,0,0,0, 180,0,200,255, 0,0,0,0,
 90,0,60,255, 0,0,0,0, 255,0,140,255
])};

test('pixel sampling preserves the silhouette holes and returns the requested count',()=>{
 const homes=sampleShapePixels(image,40000);assert.equal(homes.length,160000);
 for(let i=0;i<homes.length;i+=4){
  const x=Math.floor((homes[i]+.5)*image.width),y=Math.floor((.5-homes[i+1])*image.height);
  assert.equal(image.data[(y*image.width+x)*4+3],255);
  assert.ok(homes[i+2]>=-.16&&homes[i+2]<=.16);assert.ok(homes[i+3]>0&&homes[i+3]<=1);
 }
});

test('sample jitter is reproducible and changes when the seed changes',()=>{
 const a=sampleShapePixels(image,100,8),b=sampleShapePixels(image,100,8),c=sampleShapePixels(image,100,9);
 assert.deepEqual(a,b);assert.notDeepEqual(a,c);
 assert.ok(new Set([...a].filter((_,i)=>i%4===0)).size>90);
});

test('empty silhouettes fail explicitly rather than generating invalid particle data',()=>{
 assert.throws(()=>sampleShapePixels({width:1,height:1,data:new Uint8ClampedArray(4)},20000),/píxeles visibles/);
});

test('desktop stays within the requested range and mobile reduces GPU work',()=>{
 const desktop=particleBudget(1440),mobile=particleBudget(390),tablet=particleBudget(1024,{coarse:true});
 assert.ok(desktop>=20000&&desktop<=60000);assert.ok(mobile<desktop);assert.ok(tablet<desktop);
 assert.ok(particleBudget(390,{memory:2})<=10000);assert.ok(PARTICLE_CONFIG.maxDpr<=2);
 assert.equal(particleBudget(1440,{}, {...PARTICLE_CONFIG,count:90000}),60000);
});
