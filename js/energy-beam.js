// Analytic radiance, not a shaded surface. The invisible cylinder is a separate depth-only mesh.
export const lightVertex=`void main(){gl_Position=vec4(position.xy,0.,1.);}`;
export const lightFragment=`
precision highp float;
uniform mat4 uInverseProjection;uniform vec2 uResolution;uniform vec3 uA,uB,uColor,uCoreColor;
uniform float uRadius,uStrength,uTime,uCoreWidth,uHdr,uGlowWidth,uMist,uTipFade,uVariant;
out vec4 outColor;
void main(){
 if(uVariant>.5)discard;
 vec2 ndc=gl_FragCoord.xy/uResolution*2.-1.;vec4 q=uInverseProjection*vec4(ndc,1.,1.);vec3 ray=normalize(q.xyz/q.w),axis=uB-uA;
 float length2=dot(axis,axis),dr=dot(ray,axis),ar=dot(ray,uA),as=dot(axis,uA),den=max(.000001,length2-dr*dr);
 float along=clamp((dr*ar-as)/den,0.,1.);vec3 center=uA+axis*along;float travel=max(.001,dot(center,ray)),distance=length(ray*travel-center);
 float width=max(.00001,uRadius);if(distance>width*45.)discard;
 float endFade=smoothstep(0.,uTipFade,along)*(1.-smoothstep(1.-uTipFade,1.,along));
 float organic=1.+.017*sin(dot(center,vec3(1.7,3.1,2.3))+uTime*.19)+.012*sin(uTime*.31+center.y*5.1);
 float core=exp(-pow(distance/(width*uCoreWidth),1.3))*uHdr;
 float glow=exp(-distance/(width*uGlowWidth))*.16,brume=exp(-distance/(width*10.))*uMist;
 float coverage=clamp(core+glow+brume,0.,1.)*endFade*uStrength;if(coverage<.0004)discard;
 vec3 emission=(uCoreColor*core+uColor*(glow+brume))*organic;
 outColor=vec4(emission/max(.0001,clamp(core+glow+brume,0.,1.)),clamp(coverage,0.,1.));
}`;
export const singularityFragment=`
precision highp float;uniform vec2 uResolution;uniform float uProgress,uTime,uFlash,uActive;uniform vec4 uPhases;uniform vec3 uHotA,uHotB;out vec4 outColor;
void main(){if(uActive<.5||uProgress>=uPhases.y)discard;vec2 p=(gl_FragCoord.xy-uResolution*.5)/uResolution.y;float r=length(p),pulse=1.+.035*sin(uTime*1.1);
 float singular=1.-smoothstep(uPhases.x,uPhases.x+.04,uProgress),core=exp(-pow(r/.0018,1.2))*4.*singular*pulse,halo=exp(-r/.013)*.055*singular;
 float b=clamp((uProgress-uPhases.x)/max(.01,uPhases.y-uPhases.x),0.,1.),flash=exp(-pow((b-.18)/.12,2.))*uFlash*step(uPhases.x,uProgress);
 float wave=exp(-abs(r-(1.-pow(1.-b,3.))*.9)*130.)*(1.-smoothstep(.6,1.,b))*.45*step(uPhases.x,uProgress);
 float alpha=clamp(core+halo+flash*exp(-r*7.)+wave,0.,1.);if(alpha<.0005)discard;
 vec3 color=vec3(core+halo)+mix(uHotA,uHotB,.5)*(flash*exp(-r*7.)+wave);outColor=vec4(color/max(.001,alpha),alpha);
}`;
