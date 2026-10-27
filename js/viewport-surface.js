// Toolbar travel changes the visible viewport, not the story's scroll distance.
// Two CSS probes give the browser's small/large viewports without guessing screen pixels.
export function viewportPlan({width,visibleHeight,smallHeight,largeHeight,mobile}){
 const visible=Math.max(240,Math.round(visibleHeight));
 return {mobile,width:Math.max(1,Math.round(width)),visibleHeight:visible,
  referenceHeight:mobile?Math.max(240,Math.round(smallHeight||visible)):visible,
  surfaceHeight:mobile?Math.max(visible,Math.round(largeHeight||visible)):visible};
}
export function createViewportSurface(){
 const small=document.createElement('div'),large=document.createElement('div');let previous;
 for(const [probe,name,unit]of [[small,'small','svh'],[large,'large','lvh']]){
  probe.className='viewport-'+name+'-probe';probe.setAttribute('aria-hidden','true');
  probe.style.cssText='position:fixed;left:0;top:0;width:0;visibility:hidden;pointer-events:none;contain:strict;height:100vh;height:100'+unit;
  document.body.append(probe);
 }
 return {read(){if(document.hidden&&previous)return previous;const vv=window.visualViewport,mobile=document.documentElement.clientWidth<=700||matchMedia('(pointer:coarse)').matches;
  return previous=viewportPlan({width:document.documentElement.clientWidth,visibleHeight:vv&&vv.height>0&&Math.abs(vv.scale-1)<.01?vv.height:innerHeight,smallHeight:small.offsetHeight,largeHeight:large.offsetHeight,mobile});
 },dispose(){small.remove();large.remove();}};
}
