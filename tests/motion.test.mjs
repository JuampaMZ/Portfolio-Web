import test from 'node:test';
import assert from 'node:assert/strict';
import { pointerRotationSpeed, prismLayout, viewportPointerPosition } from '../js/motion.js';

test('center stops and edges accelerate in the corresponding direction', () => {
  for (const position of [-.16, -.05, 0, .05, .16]) assert.equal(Math.abs(pointerRotationSpeed(position)), 0);
  assert.ok(pointerRotationSpeed(.9) > pointerRotationSpeed(.5));
  assert.ok(pointerRotationSpeed(.5) > pointerRotationSpeed(.2));
  assert.equal(pointerRotationSpeed(-.8), -pointerRotationSpeed(.8));
  assert.equal(pointerRotationSpeed(5), pointerRotationSpeed(1));
  assert.equal(pointerRotationSpeed(-5), pointerRotationSpeed(-1));
  assert.ok(pointerRotationSpeed(.99) > 65);
});

test('viewport margins keep steering active up to both screen edges', () => {
  const width = 1280;
  assert.equal(viewportPointerPosition(width / 2, width), 0);
  assert.equal(viewportPointerPosition(0, width), -1);
  assert.equal(viewportPointerPosition(width, width), 1);
  // These positions lie outside the portfolio content column.
  assert.ok(pointerRotationSpeed(viewportPointerPosition(1275, width)) > pointerRotationSpeed(viewportPointerPosition(1170, width)));
  assert.ok(pointerRotationSpeed(viewportPointerPosition(5, width)) < pointerRotationSpeed(viewportPointerPosition(110, width)));
});

test('polygon has neighboring faces that remain visible beside the central face', () => {
  for (const count of [2, 3, 5]) {
    const layout = prismLayout(count, 480);
    assert.ok(layout.faceCount >= 5);
    assert.equal(layout.faceCount % count, 0);
    assert.ok(layout.step < 90);
    assert.ok(Math.cos(layout.step * Math.PI / 180) > 0);
    assert.ok(layout.radius > 0 && Number.isFinite(layout.radius));
    const spacing = 2 * layout.radius * Math.tan(Math.PI / layout.faceCount) - 480;
    assert.ok(spacing >= 18 && spacing <= 36);
    assert.ok(Math.abs(spacing - layout.gap) < .001);
  }
  assert.deepEqual(prismLayout(1, 480), { faceCount: 1, step: 360, radius: 0, gap: 0 });
});
