import test from 'node:test';
import assert from 'node:assert/strict';
import { cursorResponse, pointerImpact } from '../js/cinema-particles.js';

test('a compact cursor core grows moderately with impact speed',()=>{
 const slow=cursorResponse(pointerImpact(2,0,20)),fast=cursorResponse(pointerImpact(80,0,20));
 assert.ok(fast.radiusScale>slow.radiusScale);assert.ok(fast.impact>slow.impact);
 assert.equal(cursorResponse(0).corePixels,16);assert.ok(fast.corePixels<=26);
 assert.equal(pointerImpact(0,0,0),0);assert.equal(pointerImpact(1000,1000,1),1);
});
