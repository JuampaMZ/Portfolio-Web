export const clamp01=x=>Math.max(0,Math.min(1,x));
export const smooth=(a,b,x)=>{const t=clamp01((x-a)/Math.max(.0001,b-a));return t*t*(3-2*t);};
export function bangPhases(c){const values=[c.bangSingularityEnd,c.bangExplosionEnd,c.bangExpansionEnd,c.bangAbsorptionEnd];return values.map((v,i)=>Math.max((i+1)*.02,Math.min(.92+i*.02,Number(v)||[.1,.3,.6,.9][i]))).reduce((a,v)=>[...a,Math.max(v,(a.at(-1)||0)+.02)],[]);}
export function bigBangState(progress,c){
 const p=clamp01(progress),phases=bangPhases(c),[a,b,d,e]=phases;
 return {progress:p,phases,phase:p<a?'singularity':p<b?'explosion':p<d?'expansion':p<e?'absorption':'formed',
  beam:smooth(d,e,p),background:smooth(b,d,p),text:smooth(e,1,p),visible:smooth(a,a+(b-a)*.28,p)};
}
export function createBangProgress(c){let p=0;return {step(target,dt,smoothing=c.bangScrollSmoothing){p+=(clamp01(target)-p)*(1-Math.exp(-Math.max(0,dt)/smoothing));if(Math.abs(p-target)<.00005)p=clamp01(target);return p;},seek(value){p=clamp01(value);return p;}};}
export const cosmicUniforms=`uniform float uBigBang,uStoryActive,uBangAttraction,uBeamCount,uCoreCount,uBeamLength,uBeamRadius,uBeamVariant,uVisualTime;uniform vec4 uPhases;uniform vec3 uHotA,uHotB;bool inBeam(float id){return id>=uCoreCount;}vec3 beamPhoton(float id,float time);`;
export const cosmicSource=`
float bangSmooth(float a,float b,float p){float t=clamp((p-a)/max(.0001,b-a),0.,1.);return t*t*(3.-2.*t);}
float beamPhase(float id,float time){return fract(random(id+303.)+time*(.14+random(id+309.)*.22));}
vec3 beamPhoton(float id,float time){float phase=beamPhase(id,time),a=(phase-.5)*uBeamLength,angle=random(id+319.)*6.2831853+time*(.12+random(id+321.)*.3);float escape=pow(max(0.,sin(time*.19+random(id+333.)*30.)),36.);float radius=uBeamRadius*sqrt(-log(max(.0001,random(id+311.))))*(.21+escape*3.);return uBeamBasis*vec3(cos(angle)*radius,a,sin(angle)*radius)+uCenter;}
vec3 bangCloud(float id,float p,float time){
 float a=random(id+401.)*6.2831853,z=random(id+409.)*2.-1.,r=sqrt(max(0.,1.-z*z));vec3 direction=vec3(cos(a)*r,sin(a)*r,z);
 float expansion=bangSmooth(uPhases.x,uPhases.z,p),distance=mix(.001,.48+random(id+419.)*.56,1.-pow(1.-expansion,3.));
 vec3 burst=direction*distance;float cluster=mod(id,3.),turn=cluster*2.0943951+.4;
 vec3 anchor=vec3(cos(turn)*.50,sin(turn)*.30,(cluster-1.)*.10);float spiral=mod(floor(id/3.),2.)*3.14159265+sqrt(random(id+421.))*6.+(random(id+401.)-.5)*.3+time*.018;float cloudRadius=sqrt(random(id+423.))*.32;
 vec3 cloud=anchor+vec3(cos(spiral)*cloudRadius,sin(spiral)*cloudRadius*.65,z*.06);cloud+=curlNoise(cloud*3.,time*.035)*.08;
 vec3 result=mix(burst,cloud,bangSmooth(uPhases.y,uPhases.z,p))*uPlacement.z*1.5;result.z=clamp(result.z,-.8,.65);return result;
}
vec3 cosmicTarget(float id,float p,float time,vec3 orbit){
 if(p>=uPhases.w)return orbit;
 if(p<=uPhases.z)return bangCloud(id,p,time);
 vec3 cloud=bangCloud(id,min(p,uPhases.z),time);float t=bangSmooth(uPhases.z,uPhases.w,p);t=pow(t,1./max(.3,uBangAttraction));
 float swirl=sin(t*3.14159265)*(1.-t)*4.;vec3 q=transpose(uBeamBasis)*cloud;q.xz=mat2(cos(swirl),-sin(swirl),sin(swirl),cos(swirl))*q.xz;
 return mix(uBeamBasis*q,orbit,t);
}`;
