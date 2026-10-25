// Degrees per second. The central dead zone keeps links easy to select.
export function pointerRotationSpeed(position) {
  const x = Math.max(-1, Math.min(1, position));
  const distance = Math.max(0, (Math.abs(x) - .16) / .84);
  return Math.sign(x) * 36 * Math.pow(distance, 1.5);
}

export function prismLayout(projectCount, faceWidth) {
  const faceCount = projectCount > 1 ? projectCount * Math.ceil(6 / projectCount) : 1;
  return {
    faceCount,
    step: 360 / faceCount,
    radius: faceCount > 1 ? faceWidth / (2 * Math.tan(Math.PI / faceCount)) : 0,
  };
}
