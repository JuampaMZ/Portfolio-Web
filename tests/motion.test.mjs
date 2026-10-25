import test from 'node:test';
import assert from 'node:assert/strict';
import { pointerRotationSpeed, prismLayout } from '../js/motion.js';

test('center stops and edges accelerate in the corresponding direction', () => {
  for (const position of [-.16, -.05, 0, .05, .16]) assert.equal(Math.abs(pointerRotationSpeed(position)), 0);
  assert.ok(pointerRotationSpeed(.9) > pointerRotationSpeed(.5));
  assert.ok(pointerRotationSpeed(.5) > pointerRotationSpeed(.2));
  assert.equal(pointerRotationSpeed(-.8), -pointerRotationSpeed(.8));
  assert.equal(pointerRotationSpeed(5), pointerRotationSpeed(1));
  assert.equal(pointerRotationSpeed(-5), pointerRotationSpeed(-1));
});

test('polygon has neighboring faces that remain visible beside the central face', () => {
  for (const count of [2, 3]) {
    const layout = prismLayout(count, 480);
    assert.ok(layout.faceCount >= 6);
    assert.equal(layout.faceCount % count, 0);
    assert.ok(layout.step < 90);
    assert.ok(Math.cos(layout.step * Math.PI / 180) > 0);
    assert.ok(layout.radius > 0 && Number.isFinite(layout.radius));
    assert.ok(Math.abs(2 * layout.radius * Math.tan(Math.PI / layout.faceCount) - 480) < .001);
  }
  assert.deepEqual(prismLayout(1, 480), { faceCount: 1, step: 360, radius: 0 });
});
