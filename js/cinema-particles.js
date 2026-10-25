const clamp01=value=>Math.max(0,Math.min(1,value));

export function pointerImpact(dx,dy,elapsedMs) {
  const elapsed=Math.max(4,Math.min(40,elapsedMs));
  return clamp01(Math.hypot(dx,dy)/elapsed/1.8);
}

export function cursorResponse(speed) {
  const impact=Math.pow(clamp01(speed),.72);
  return {impact,radiusScale:1.2+impact*.8,corePixels:16+impact*10};
}
