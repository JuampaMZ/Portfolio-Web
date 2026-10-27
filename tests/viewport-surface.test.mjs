import test from 'node:test';import assert from 'node:assert/strict';
import {viewportPlan} from '../js/viewport-surface.js';
test('mobile toolbar travel reveals one surface without changing the story reference',()=>{
 for(const h of [844,875,932,860,844]){const p=viewportPlan({width:390,visibleHeight:h,smallHeight:844,largeHeight:932,mobile:true});assert.equal(p.referenceHeight,844);assert.equal(p.surfaceHeight,932);assert.ok(p.surfaceHeight>=p.visibleHeight);}
});
test('orientation and desktop window changes select new dimensions instead of retaining a stale surface',()=>{
 const landscape=viewportPlan({width:844,visibleHeight:390,smallHeight:320,largeHeight:390,mobile:true});assert.equal(landscape.surfaceHeight,390);assert.equal(landscape.referenceHeight,320);
 const desktop=viewportPlan({width:1440,visibleHeight:900,smallHeight:800,largeHeight:1100,mobile:false});assert.equal(desktop.surfaceHeight,900);assert.equal(desktop.referenceHeight,900);
});
