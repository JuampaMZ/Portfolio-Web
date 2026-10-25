import test from 'node:test';
import assert from 'node:assert/strict';
import { createDissolveTrail, cursorResponse, pointerImpact } from '../js/cinema-particles.js';

const strengths=uniforms=>[...uniforms].filter((_,index)=>index%4===2);
test('localized damage builds under the cursor and reconstructs after it leaves',()=>{
 const trail=createDissolveTrail();let field;
 for(let frame=0;frame<30;frame++)field=trail.advance(frame/30,.4,.1,1,.16);
 assert.ok(strengths(field)[0]>.8);
 assert.equal(field[0],Math.fround(.4));
 for(let frame=30;frame<120;frame++)field=trail.advance(frame/30,.4,.1,0,.16);
 assert.ok(strengths(field).every(strength=>strength<.001));
});
test('fast cursor paths retain a bounded damage history',()=>{
 const trail=createDissolveTrail();let field;
 for(let frame=0;frame<120;frame++)field=trail.advance(frame/60,Math.sin(frame*.3),Math.cos(frame*.3),1,.16);
 assert.equal(field.length,20);
 assert.ok([...field].every(Number.isFinite));
 assert.ok(strengths(field).every(strength=>strength>=0&&strength<=1));
 assert.ok(strengths(field).filter(strength=>strength>0).length<=5);
});
test('pausing freezes fragmentation and reset clears all damage',()=>{
 const trail=createDissolveTrail();let field;
 for(let frame=0;frame<20;frame++)field=trail.advance(frame/30,.3,-.2,1,.16);
 const before=[...field];
 field=trail.advance(20/30,0,0,0,.16,false);
 assert.deepEqual([...field],before);
 trail.reset();
 assert.ok([...trail.advance(0,0,0,0,.16)].every(value=>value===0));
});

test('cursor speed increases fracture reach and retains a stationary protective core',()=>{
 const slow=cursorResponse(pointerImpact(2,0,20));
 const fast=cursorResponse(pointerImpact(80,0,20));
 assert.ok(fast.radiusScale>slow.radiusScale*1.7);
 assert.ok(fast.impact>slow.impact);
 assert.ok(fast.corePixels>slow.corePixels);
 assert.ok(cursorResponse(0).corePixels>=40);
 assert.equal(pointerImpact(0,0,0),0);
 assert.equal(pointerImpact(1000,1000,1),1);
});

test('fast entries fracture more widely and strongly than slow entries',()=>{
 const slow=createDissolveTrail(),fast=createDissolveTrail();
 let gentle,impact;
 for(let frame=0;frame<4;frame++){
  gentle=slow.advance(frame/30,.4,.1,1,.16,true,.02);
  impact=fast.advance(frame/30,.4,.1,1,.16,true,1);
 }
 assert.ok(impact[3]>gentle[3]*1.7);
 assert.ok(impact[2]>gentle[2]);
 assert.ok(fast.impacts[0]>.9);
});

test('holding the cursor prevents local reconstruction after impact energy fades',()=>{
 const trail=createDissolveTrail();let field;
 for(let frame=0;frame<180;frame++)field=trail.advance(frame/30,.4,.1,1,.16,true,frame<5?1:0);
 assert.ok(field[2]>.8);
 assert.ok(trail.impacts[0]<.01);
 assert.ok(field[3]>.10);
});
