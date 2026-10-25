import test from 'node:test';
import assert from 'node:assert/strict';
import { storyState, scrollProgress } from '../js/scroll-math.js';

test('cinematic text progresses through three chapters in both directions', () => {
  assert.equal(storyState(0).chapter, 0);
  assert.equal(storyState(.5).chapter, 1);
  assert.equal(storyState(1).chapter, 2);
  for (const progress of [1,.9,.72,.65,.5,.32,.25,0,-2,2]) {
    const state = storyState(progress);
    assert.ok(state.weights.every(weight => weight >= 0 && weight <= 1));
    assert.ok(Math.abs(state.weights.reduce((a,b)=>a+b,0) - 1) < .00001);
  }
});
test('section progress respects sticky header and clamps before and after the scene', () => {
  assert.equal(scrollProgress(88, 2800, 800, 88), 0);
  assert.equal(scrollProgress(1000, 2800, 800, 88), 0);
  assert.equal(scrollProgress(-2000, 2800, 800, 88), 1);
  const middle = scrollProgress(-956, 2800, 800, 88);
  assert.ok(Math.abs(middle - .5) < .0001);
  assert.ok(Number.isFinite(scrollProgress(0,0,800,88)));
});
test('only one chapter of copy is visible during crossfades', () => {
  for (let sample = 0; sample <= 1000; sample++) {
    const state = storyState(sample / 1000);
    assert.ok(state.textWeights.filter(weight => weight > 0).length <= 1);
  }
  assert.equal(storyState(0).textWeights[0], 1);
  assert.equal(storyState(.5).textWeights[1], 1);
  assert.equal(storyState(1).textWeights[2], 1);
});
