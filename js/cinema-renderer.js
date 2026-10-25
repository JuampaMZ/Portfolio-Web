import { createDissolveTrail, cursorResponse } from './cinema-particles.js';

const commonSource=`
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uProgress;
uniform vec2 uPointer;
uniform float uHover;
uniform vec4 uTouches[5];
uniform float uImpacts[5];
uniform vec4 uCore;
uniform vec4 uMotion;
vec2 gCenter;float gZoom;vec3 gCamera;
mat2 rotate(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
float smoothUnion(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
void setupCamera(){
 float mobile=1.-step(1.,uResolution.x/uResolution.y);
 gCenter=mix(vec2(.38,.10),vec2(0.,.15),mobile);
 gZoom=1.+.09*sin(uProgress*3.14159);
 gCamera=vec3(0.,.08,mix(5.5,8.8,mobile)-uProgress*mix(1.1,.55,mobile));
}
float yaw(){return uProgress*4.8+uTime*.075+uPointer.x*uHover*.16;}
float roll(){return -.45+uProgress*1.2;}
float pitch(){return .45+sin(uTime*.09)*.14+uPointer.y*uHover*.10;}
vec3 localPoint(vec3 p){
 p.xz=rotate(yaw())*p.xz;p.xy=rotate(roll())*p.xy;p.yz=rotate(pitch())*p.yz;return p;
}
vec3 worldPoint(vec3 p){
 p.yz=rotate(-pitch())*p.yz;p.xy=rotate(-roll())*p.xy;p.xz=rotate(-yaw())*p.xz;return p;
}
float ribbon(vec3 p,float phase){
 float a=atan(p.z,p.x);
 float radius=1.23+.13*sin(a*3.+phase);
 vec2 crossSection=vec2(length(p.xz)-radius,p.y-.24*sin(a*2.+phase));
 crossSection=rotate(a*1.5+phase)*crossSection;
 return (length(crossSection/vec2(.22,.38))-1.)*.20;
}
float rawShape(vec3 p){
 float a=ribbon(p,0.);
 vec3 q=p;q.yz=rotate(1.2+uProgress*.5)*q.yz;q.xy=rotate(.5)*q.xy;
 return smoothUnion(a,ribbon(q,2.1),.12);
}
vec2 projectPoint(vec3 p){return (p.xy-gCamera.xy)*2.4*gZoom/(1.8*(gCamera.z-p.z))+gCenter;}
float damageAt(vec2 screen){
 float damage=0.;
 for(int i=0;i<5;i++){
  float radius=max(uTouches[i].w,.0001);
  float falloff=1.-smoothstep(radius*.22,radius,length(screen-uTouches[i].xy));
  damage=max(damage,uTouches[i].z*falloff);
 }
 float coreRadius=max(uCore.z,.0001);
 float core=(1.-smoothstep(coreRadius*.82,coreRadius*1.42,length(screen-uCore.xy)))*uCore.w;
 return max(damage,core);
}
float impactAt(vec2 screen){
 float impact=0.;
 for(int i=0;i<5;i++){
  float radius=max(uTouches[i].w,.0001);
  float falloff=1.-smoothstep(radius*.2,radius,length(screen-uTouches[i].xy));
  impact=max(impact,uImpacts[i]*falloff*uTouches[i].z);
 }
 return impact;
}
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
`;

const vertexSource=`attribute vec2 aPosition;void main(){gl_Position=vec4(aPosition,0.,1.);}`;
const fragmentSource=commonSource+`
float gDamage;
float beamX(){return sin(uTime*.32)*.11;}
float beamDistance(vec3 p){
 vec2 d=vec2(length(p.xz-vec2(beamX(),1.25))-.010,abs(p.y)-1.54);
 return min(max(d.x,d.y),0.)+length(max(d,0.));
}
vec2 mapScene(vec3 p){
 vec3 local=localPoint(p);
 float body=rawShape(local);
 if(gDamage>.001){
  float wave=sin(local.x*13.+uTime*2.1)*sin(local.y*11.-uTime*1.7)*sin(local.z*9.+uTime);
  body+=gDamage*(.36+wave*.032);
 }
 float beam=beamDistance(p);
 return body<beam?vec2(body,0.):vec2(beam,2.);
}
vec3 normalAt(vec3 p){
 vec2 e=vec2(.002,0.);
 return normalize(vec3(mapScene(p+e.xyy).x-mapScene(p-e.xyy).x,mapScene(p+e.yxy).x-mapScene(p-e.yxy).x,mapScene(p+e.yyx).x-mapScene(p-e.yyx).x));
}
vec3 environment(vec3 d){
 vec3 color=vec3(.018,.026,.031);
 color+=vec3(.91,1.,.81)*pow(max(0.,dot(d,normalize(vec3(-.5,1.,.7)))),24.)*2.6;
 color+=vec3(.35,.59,.57)*pow(max(0.,dot(d,normalize(vec3(1.,.3,-.6)))),7.)*.8;
 color+=vec3(.91,.66,.37)*pow(max(0.,dot(d,normalize(vec3(-1.,-.15,-.8)))),34.)*1.8;
 return color;
}
void main(){
 setupCamera();
 vec2 screen=(gl_FragCoord.xy-.5*uResolution)/uResolution.y;
 vec2 uv=screen-gCenter;
 gDamage=damageAt(screen);
 vec3 ro=gCamera,rd=normalize(vec3(uv*1.8/gZoom,-2.4));
 vec3 color=vec3(.016,.026,.035)+vec3(.06,.13,.12)*exp(-length(uv*vec2(.85,1.))*2.5);
 float t=0.;vec2 sampleValue=vec2(0.);bool hit=false;
 for(int i=0;i<100;i++){
  sampleValue=mapScene(ro+rd*t);
  if(sampleValue.x<.0015){hit=true;break;}
  t+=max(sampleValue.x*(gDamage>.01?.55:.8),.002);
  if(t>13.)break;
 }
 if(hit){
  vec3 p=ro+rd*t;
  if(sampleValue.y>1.){
   color=vec3(4.2,5.1,3.9);
  }else{
   vec3 n=normalAt(p),reflected=reflect(rd,n);
   float diffuse=max(dot(n,normalize(vec3(-.7,1.,1.))),0.);
   float fresnel=pow(1.-max(dot(-rd,n),0.),3.);
   vec3 base=mix(vec3(.17,.25,.20),vec3(.43,.56,.40),.5+.5*sin(localPoint(p).y*2.));
   color=base*(.16+diffuse*.22)+environment(reflected)*(.55+fresnel*.6);
   color+=vec3(.57,.77,.52)*pow(max(dot(n,normalize(vec3(.9,-.2,.2))),0.),5.)*.3;
   float beamLight=exp(-length(p.xz-vec2(beamX(),1.25))*2.6);
   float energyPulse=exp(-pow((p.y-sin(uTime*.6)*1.45)*6.,2.));
   color+=vec3(.48,.78,.46)*beamLight*(.30+energyPulse*.22);
   color+=vec3(.53,.82,.67)*gDamage*pow(1.-abs(dot(n,-rd)),2.)*.3;
   color=mix(color,vec3(.03,.06,.06),1.-exp(-.014*t*t));
  }
 }
 // Bloom is occluded by the surface, so the luminous spine passes through it.
 vec2 beamDelta=vec2(beamX(),1.25)-ro.xz;
 float nearTime=max(0.,dot(beamDelta,rd.xz)/dot(rd.xz,rd.xz));
 vec3 nearPoint=ro+rd*nearTime;
 float beamRadius=length(nearPoint.xz-vec2(beamX(),1.25));
 float cap=1.-smoothstep(1.40,1.72,abs(nearPoint.y));
 float visibility=hit&&nearTime>t+.03?.10:1.;
 float energyPulse=exp(-pow((nearPoint.y-sin(uTime*.6)*1.45)*6.,2.));
 color+=vec3(.56,.94,.66)*cap*visibility*(exp(-beamRadius*22.)*.38+exp(-beamRadius*95.)*.75)*(1.+energyPulse*.9);
 float coreGlow=exp(-pow(length(screen-uCore.xy)/max(uCore.z,.0001),2.));
 color+=vec3(.27,.65,.49)*coreGlow*uCore.w*(.025+uMotion.x*.035);
 color+=vec3((hash(vec3(gl_FragCoord.xy,0.))-.5)*.007);
 color*=1.-.24*pow(length((gl_FragCoord.xy/uResolution-.5)*1.2),2.);
 color=pow(vec3(1.)-exp(-max(color,0.)*1.35),vec3(.88));
 gl_FragColor=vec4(color,1.);
}`;

const particleVertexSource=commonSource+`
attribute vec4 aSeed;
varying float vOpacity;
varying float vWarm;
varying float vGlint;
varying float vImpact;
varying vec2 vDirection;
void main(){
 setupCamera();
 float a=aSeed.x,b=aSeed.y,phase=aSeed.z>.5?2.1:0.;
 vec2 crossSection=rotate(-(a*1.5+phase))*vec2(.22*cos(b),.38*sin(b));
 float radius=1.23+.13*sin(a*3.+phase);
 vec3 local=vec3((radius+crossSection.x)*cos(a),.24*sin(a*2.+phase)+crossSection.y,(radius+crossSection.x)*sin(a));
 vec2 crossNormal=rotate(-(a*1.5+phase))*vec2(cos(b)/.22,sin(b)/.38);
 vec3 normal=normalize(vec3(crossNormal.x*cos(a),crossNormal.y,crossNormal.x*sin(a)));
 if(aSeed.z>.5){
  local.xy=rotate(-.5)*local.xy;local.yz=rotate(-1.2-uProgress*.5)*local.yz;
  normal.xy=rotate(-.5)*normal.xy;normal.yz=rotate(-1.2-uProgress*.5)*normal.yz;
 }
 vec3 origin=worldPoint(local);
 vec3 worldNormal=worldPoint(normal);
 vec2 originScreen=projectPoint(origin);
 float damage=damageAt(originScreen);
 float impact=impactAt(originScreen);
 float interior=1.-smoothstep(-.07,-.015,rawShape(local));
 float facing=smoothstep(-.18,.45,dot(normalize(gCamera-origin),worldNormal));
 // Thousands of points are anchored on the actual ribbon surface. The same
 // damage field removes that surface while these points flow out and return.
 vec3 curl=vec3(
  sin(local.y*3.6+local.z*1.8+uTime*1.2),
  cos(local.z*3.3+local.x*1.7-uTime*1.1),
  sin(local.x*3.7+local.y*1.6+uTime*.9)
 );
 vec3 flow=normal*(.12+.26*aSeed.w)*(1.+impact*2.1)+curl*(.24+impact*.28)+cross(normal,curl)*(.12+impact*.12);
 vec3 position=worldPoint(local+flow*damage)+vec3(uMotion.yz,.12)*impact*damage*.48;
 vec2 projected=projectPoint(position);
 vec2 fromCore=projected-uCore.xy;
 float coreDistance=length(fromCore);
 float coreRadius=uCore.z*sqrt(clamp(uCore.w,0.,1.));
 // Mirroring the inward radial trajectory reverses its radial velocity at the
 // boundary. The persistent core keeps returning fragments outside the cursor.
 if(coreDistance<coreRadius&&uCore.w>.01){
  vec2 outward=coreDistance>.0001?fromCore/coreDistance:vec2(cos(aSeed.w*6.283),sin(aSeed.w*6.283));
  float restitution=.76+impact*.20;
  projected=uCore.xy+outward*(coreRadius+(coreRadius-coreDistance)*restitution);
 }
 gl_Position=vec4(projected*vec2(2.*uResolution.y/uResolution.x,2.),0.,1.);
 float distanceToCamera=length(gCamera-position);
 gl_PointSize=clamp((1.1+aSeed.w*1.8)*(1.+.35*(1.-damage))*(1.+impact*.75)*(5.5/distanceToCamera)*(uResolution.y/720.),.8,6.2);
 vOpacity=smoothstep(.025,.18,damage)*(.32+.48*aSeed.w)*facing*(1.-interior);
 vWarm=aSeed.w;
 vGlint=.5+.5*sin(aSeed.w*53.+uTime*1.6);
 vImpact=impact;
 vec2 travel=projected-originScreen;
 vDirection=length(travel)>.0001?normalize(travel):vec2(1.,0.);
 if(vOpacity<.008)gl_Position=vec4(3.,3.,0.,1.);
}`;
const particleFragmentSource=`
precision mediump float;
varying float vOpacity;varying float vWarm;varying float vGlint;varying float vImpact;varying vec2 vDirection;
void main(){
 vec2 sprite=gl_PointCoord*2.-1.;
 vec2 uv=vec2(dot(sprite,vDirection),dot(sprite,vec2(-vDirection.y,vDirection.x)));
 uv.y*=1.+vImpact*.85;
 float radius=dot(uv,uv);if(radius>1.)discard;
 float sphere=sqrt(max(0.,1.-radius));
 float edge=1.-smoothstep(.58,1.,radius);
 vec3 tint=mix(vec3(.68,.90,.75),vec3(.94,.82,.57),step(.78,vWarm));
 float spec=pow(max(0.,1.-length(uv-vec2(-.24,.26))),5.);
 vec3 color=tint*(.42+sphere*.6)+vec3(spec*(.7+vGlint*.5+vImpact*.45));
 gl_FragColor=vec4(color,vOpacity*edge);
}`;

export function createCinemaRenderer(canvas) {
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,powerPreference:'low-power'});
 if(!gl)return null;
 const shaders=[],programs=[],buffers=[];
 const trail=createDissolveTrail();
 const core=new Float32Array(4),motion=new Float32Array(4);
 let width=1,height=1;
 let heldPointer={x:0,y:0,active:0,speed:0};
 function programFor(vertex,fragment){
  const program=gl.createProgram();programs.push(program);
  for(const [type,source]of[[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
   const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
   if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));
   gl.attachShader(program,shader);
  }
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  const uniforms=Object.fromEntries(['uResolution','uTime','uProgress','uPointer','uHover','uTouches[0]','uImpacts[0]','uCore','uMotion'].map(name=>[name,gl.getUniformLocation(program,name)]));
  return {program,uniforms};
 }
 function bufferFor(data){const buffer=gl.createBuffer();buffers.push(buffer);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);return buffer;}
 try{
  const surface=programFor(vertexSource,fragmentSource);
  const fragments=programFor(particleVertexSource,particleFragmentSource);
  const triangle=bufferFor(new Float32Array([-1,-1,3,-1,-1,3]));
  const seeds=new Float32Array(48000*4);
  for(let index=0;index<48000;index++){
   seeds[index*4]=(index*.61803398875%1)*Math.PI*2;
   seeds[index*4+1]=(index*.75487766625%1)*Math.PI*2;
   seeds[index*4+2]=index%2;
   seeds[index*4+3]=(index*.56984029099%1);
  }
  const particleBuffer=bufferFor(seeds);
  function uniformsFor(target,time,progress,pointer,touches){
   gl.useProgram(target.program);const u=target.uniforms;
   gl.uniform2f(u.uResolution,canvas.width,canvas.height);gl.uniform1f(u.uTime,time);gl.uniform1f(u.uProgress,progress);
   gl.uniform2f(u.uPointer,pointer.x,pointer.y);gl.uniform1f(u.uHover,pointer.active||0);gl.uniform4fv(u['uTouches[0]'],touches);
   gl.uniform1fv(u['uImpacts[0]'],trail.impacts);gl.uniform4fv(u.uCore,core);gl.uniform4fv(u.uMotion,motion);
  }
  return {
   resize(nextWidth,nextHeight){
    width=nextWidth;height=nextHeight;
    const ratio=Math.min(devicePixelRatio||1,width<700?1.1:1,1100/width);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);gl.viewport(0,0,canvas.width,canvas.height);
    trail.reset();
    heldPointer={x:0,y:0,active:0,speed:0};
   },
   draw(time,progress,pointer,moving=true){
    if(gl.isContextLost())return;
    if(moving)heldPointer={...pointer};
    const effectPointer=moving?pointer:heldPointer;
    const x=(effectPointer.rawX??effectPointer.x)*.5*width/height,y=-(effectPointer.rawY??effectPointer.y)*.5;
    const speed=effectPointer.rawSpeed??effectPointer.speed??0;
    const response=cursorResponse(speed);
    const activity=effectPointer.rawActive??effectPointer.active??0;
    const touches=trail.advance(time,x,y,activity,Math.min(130,height*.17)/height,moving,speed);
    core.set([x,y,Math.min(response.corePixels,height*.105)/height,activity>.35?1:effectPointer.active||0]);
    motion.set([Math.max(response.impact,...trail.impacts),effectPointer.velocityX||0,effectPointer.velocityY||0,0]);
    gl.disable(gl.BLEND);uniformsFor(surface,time,progress,effectPointer,touches);
    gl.bindBuffer(gl.ARRAY_BUFFER,triangle);const position=gl.getAttribLocation(surface.program,'aPosition');
    gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,3);
    if(core[3]>.01||touches.some((value,index)=>index%4===2&&value>.005)){
     uniformsFor(fragments,time,progress,effectPointer,touches);
     gl.bindBuffer(gl.ARRAY_BUFFER,particleBuffer);const seed=gl.getAttribLocation(fragments.program,'aSeed');
     gl.enableVertexAttribArray(seed);gl.vertexAttribPointer(seed,4,gl.FLOAT,false,0,0);
     gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
     gl.drawArrays(gl.POINTS,0,width<700?24000:48000);gl.disable(gl.BLEND);
    }
   }
  };
 }catch(error){
  console.warn('La escena usa su alternativa estática.',error.message);
  buffers.forEach(buffer=>gl.deleteBuffer(buffer));programs.forEach(program=>gl.deleteProgram(program));shaders.forEach(shader=>gl.deleteShader(shader));return null;
 }
}
