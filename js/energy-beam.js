// Three concentric, depth-tested cylinders. The particles and the camera are unchanged.
export const energyVertex=`
uniform float uTime,uThicknessWave;
out vec3 vNormal,vView;out float vAxial,vAngle;
float profile(float y){float tip=pow(max(0.,sin(clamp(y,0.,1.)*3.14159265)),.28);float wave=.55*sin(y*19.-uTime*.58)+.45*sin(y*41.+uTime*.37);return tip*(1.+uThicknessWave*wave);}
void main(){
 vAxial=uv.y;vAngle=atan(position.z,position.x);float width=profile(vAxial),slope=(profile(min(1.,vAxial+.001))-profile(max(0.,vAxial-.001)))/.002;
 vec3 p=position;p.xz*=width;vec3 n=abs(normal.y)>.5?normal:normalize(vec3(normal.x,-slope,normal.z));
 vec4 view=modelViewMatrix*vec4(p,1.);vView=view.xyz;vNormal=normalize(normalMatrix*n);gl_Position=projectionMatrix*view;
}`;
export const energyFragment=`
in vec3 vNormal,vView;in float vAxial,vAngle;
uniform vec3 uColor,uCoreColor;uniform float uStrength,uPulse,uCoreStart,uTime,uLayer,uFresnel,uNoiseSpeed,uNoiseScale,uPulseIntensity,uEnvelopeOpacity;
out vec4 outColor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.57+noise(p*2.03+4.7)*.28+noise(p*4.11-2.1)*.15;}
void main(){
 float tip=smoothstep(0.,.065,vAxial)*(1.-smoothstep(.935,1.,vAxial));if(tip<.008)discard;
 float facing=clamp(abs(dot(normalize(vNormal),normalize(-vView))),0.,1.),fresnel=pow(1.-facing,2.4);
 float clock=uTime*uNoiseSpeed,n=fbm(vec2(vAngle*1.7+sin(vAxial*8.-clock)*.25,vAxial*uNoiseScale-clock));
 float current=pow(.5+.5*sin(vAxial*43.-clock*4.+n*7.+vAngle*2.),5.);
 float pulse=1.+uPulseIntensity*(.5*sin(uPulse)+.3*sin(uPulse*1.618+.7)+.2*sin(uPulse*.47+2.));
 float spark=exp(-pow((min(vAxial,1.-vAxial)-.035)/.026,2.));
 if(uLayer<.5){outColor=vec4(uCoreColor*uStrength*(.94+.06*n)*pulse,tip);return;}
 vec3 roundBody=uColor*(.46+.54*facing),energy=uColor*(.20*n+.30*current+uFresnel*fresnel*.70+spark*.52);
 float hot=pow(facing,clamp(14.+(uCoreStart-.85)*133.333,8.,40.));vec3 light=mix(roundBody+energy,uCoreColor*(.96+.10*current),hot*.92)*uStrength*pulse;
 float alpha=mix(.96,.42,fresnel)*tip;
 if(uLayer>1.5){light=uColor*(.75+.45*n+spark*.65)*uStrength;alpha=uEnvelopeOpacity*(.25+.75*fresnel)*tip*(.7+.3*n);}
 outColor=vec4(light,alpha);
}`;
