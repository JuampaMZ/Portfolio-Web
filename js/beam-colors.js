// OKLab matrices: Björn Ottosson, https://bottosson.github.io/posts/oklab/ (public domain).
const clamp=v=>Math.max(0,Math.min(1,v));
export function hexToLinear(hex){return [1,3,5].map(i=>{const c=parseInt(hex.slice(i,i+2),16)/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});}
export function linearToOklab([r,g,b]){
 const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
 return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];
}
export function oklabToLinear([L,a,b]){
 const l=(L+.3963377774*a+.2158037573*b)**3,m=(L-.1055613458*a-.0638541728*b)**3,s=(L-.0894841775*a-1.291485548*b)**3;
 return [4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s].map(clamp);
}
export function beamColors(time,settings){
 const amount=.5-.5*Math.cos(time*2*Math.PI/Math.max(1,settings.beamColorSeconds)),a=linearToOklab(hexToLinear(settings.beamColor)),b=linearToOklab(hexToLinear(settings.beamColorTo));
 const lab=a.map((v,i)=>v+(b[i]-v)*amount),white=settings.beamCoreWhite;
 return {amount,body:oklabToLinear(lab),core:oklabToLinear([lab[0]+(1-lab[0])*white,lab[1]*(1-white),lab[2]*(1-white)]),glow:oklabToLinear([Math.min(.95,lab[0]+settings.beamGlowLift),lab[1]*.72,lab[2]*.72])};
}
