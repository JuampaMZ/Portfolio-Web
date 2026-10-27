import test from 'node:test';
import assert from 'node:assert/strict';
import {createWheelSmoother} from '../js/intro-scroll.js';

test('desktop wheel steps are spread across frames and accumulate without dropping distance',()=>{
 const wheel=createWheelSmoother(.12);wheel.push(120,0,2000);let previous=0;
 for(let i=0;i<6;i++){const y=wheel.step(1/60);assert.ok(y>previous&&y-previous<20);previous=y;}
 wheel.push(120,previous,2000);assert.equal(wheel.target,240);
 for(let i=0;i<100;i++)wheel.step(1/60);assert.equal(wheel.active,false);assert.equal(wheel.step(0),240);
});
test('wheel interpolation uses elapsed time and reverses from the current position',()=>{
 const a=createWheelSmoother(),b=createWheelSmoother();a.push(200,0,1000);b.push(200,0,1000);
 let y;for(let i=0;i<12;i++)y=a.step(1/120);assert.ok(Math.abs(y-b.step(.1))<1e-8);
 a.push(-160,y,1000);const next=a.step(1/60);assert.ok(next<y&&next>=0);assert.equal(a.target,0,'Reversing discards queued forward travel');
});
test('wheel targets clamp at page limits and cancellation returns control to native navigation',()=>{
 const wheel=createWheelSmoother();wheel.push(-500,100,800);assert.equal(wheel.target,0);wheel.cancel(400);wheel.push(800,400,800);assert.equal(wheel.target,800);wheel.cancel(325);assert.equal(wheel.active,false);assert.equal(wheel.step(1),325);
});
