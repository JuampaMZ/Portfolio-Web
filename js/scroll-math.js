export const clamp01 = value => Math.max(0, Math.min(1, value));
const smoothstep = (start, end, value) => {
  const p = clamp01((value - start) / (end - start));
  return p * p * (3 - 2 * p);
};

export function storyState(progress) {
  const p = clamp01(progress);
  const first = 1 - smoothstep(.23, .38, p);
  const last = smoothstep(.62, .77, p);
  const weights = [first, 1 - first - last, last];
  const chapter = weights.indexOf(Math.max(...weights));
  const textWeights = weights.map(weight => clamp01((weight - .5) * 2));
  return { progress: p, weights, textWeights, chapter };
}

export function scrollProgress(sectionTop, sectionHeight, viewportHeight, headerHeight) {
  const travel = sectionHeight - Math.max(1, viewportHeight - headerHeight);
  return clamp01((headerHeight - sectionTop) / Math.max(1, travel));
}
