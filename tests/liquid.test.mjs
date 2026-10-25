import test from 'node:test';
import assert from 'node:assert/strict';
import { createDissolveTrail } from '../js/cinema-particles.js';

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
