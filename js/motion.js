// Degrees per second. The central dead zone keeps links easy to select.
export function pointerRotationSpeed(position) {
  const x = Math.max(-1, Math.min(1, position));
  const distance = Math.max(0, (Math.abs(x) - .16) / .84);
  return Math.sign(x) * 72 * Math.pow(distance, 1.4);
}

export function viewportPointerPosition(clientX, viewportWidth) {
  return Math.max(-1, Math.min(1, clientX / Math.max(1, viewportWidth) * 2 - 1));
}

export function prismLayout(projectCount, faceWidth) {
  const faceCount = projectCount >= 5 ? projectCount : projectCount > 1 ? projectCount * Math.ceil(6 / projectCount) : 1;
  const gap = faceCount > 1 ? Math.max(18, Math.min(36, faceWidth * .075)) : 0;
  return {
    faceCount,
    step: 360 / faceCount,
    gap,
    radius: faceCount > 1 ? (faceWidth + gap) / (2 * Math.tan(Math.PI / faceCount)) : 0,
  };
}
