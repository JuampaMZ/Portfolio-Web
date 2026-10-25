import { createDissolveTrail, cursorResponse } from './cinema-particles.js';
import { createParticleSimulation, makeScenePose, locateCursorCore } from './particle-physics.js';

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
uniform mat3 uLocal;
uniform vec3 uCamera;
uniform vec2 uCenter;
uniform float uZoom;
uniform float uHasDepth;
vec2 gCenter;float gZoom;vec3 gCamera;
mat2 rotate(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
float smoothUnion(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
void setupCamera(){gCenter=uCenter;gZoom=uZoom;gCamera=uCamera;}
vec3 localPoint(vec3 p){return uLocal*p;}
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
 // DEPTH_WRITE
}`;


const particleVertexSource=commonSource+`
attribute vec4 aPositionState;
attribute vec4 aVelocityState;
attribute vec4 aRestState;
varying float vOpacity;varying float vTint;varying vec2 vDirection;varying float vSpeed;
void main(){
 setupCamera();vec3 position=aPositionState.xyz;
 vec2 projected=projectPoint(position);
 float depth=clamp((gCamera.z-position.z-.1)/15.9,0.,1.);
 gl_Position=vec4(projected*vec2(2.*uResolution.y/uResolution.x,2.),depth*2.-1.,1.);
 float speed=length(aVelocityState.xyz);
 gl_PointSize=clamp(aVelocityState.w*uResolution.y*2.666*gZoom/(gCamera.z-position.z)*(1.+min(speed,4.)*.16),1.15,6.2);
 vec2 direction=projectPoint(position+aVelocityState.xyz*.02)-projected;
 vDirection=length(direction)>.0001?normalize(direction):vec2(1.,0.);
 vOpacity=aPositionState.w;vTint=aRestState.w;vSpeed=min(speed*.4,1.);
 if(uHasDepth<.5&&rawShape(localPoint(position))<-.035&&damageAt(projected)<.35)vOpacity=0.;
 if(vOpacity<.01)gl_Position=vec4(3.,3.,0.,1.);
}`;
const particleFragmentSource=`
precision mediump float;
varying float vOpacity;varying float vTint;varying vec2 vDirection;varying float vSpeed;
void main(){
 vec2 sprite=gl_PointCoord*2.-1.;
 vec2 uv=vec2(dot(sprite,vDirection),dot(sprite,vec2(-vDirection.y,vDirection.x)));
 uv.y*=1.+vSpeed*.65;float r=dot(uv,uv);if(r>1.)discard;
 vec3 normal=normalize(vec3(uv,sqrt(max(0.,1.-r))));
 vec3 light=normalize(vec3(-.4,.65,1.));
 float diffuse=max(dot(normal,light),0.);
 float spec=pow(max(dot(normal,normalize(light+vec3(0.,0.,1.))),0.),28.);
 vec3 tint=mix(vec3(.46,.71,.61),vec3(.86,.78,.57),step(.9,vTint));
 vec3 color=tint*(.32+diffuse*.72)+vec3(spec*1.45);
 gl_FragColor=vec4(color,vOpacity*(1.-smoothstep(.60,1.,r))*.88);
}`;

export function createCinemaRenderer(canvas) {
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:true,powerPreference:'low-power'});
 if(!gl)return null;
 const hasDepth=Boolean(gl.getExtension('EXT_frag_depth'));
 const shaders=[],programs=[],buffers=[];
 const trail=createDissolveTrail(),core=new Float32Array(4),motion=new Float32Array(4);
 let width=1,height=1,simulation=null,previousTime=null,physicalCore=null;
 let heldPointer={x:0,y:0,active:0,speed:0};
 function programFor(vertex,fragment){
  const program=gl.createProgram();programs.push(program);
  for(const [type,code]of[[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
   const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,code);gl.compileShader(shader);
   if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));
   gl.attachShader(program,shader);
  }
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  const names=['uResolution','uTime','uProgress','uPointer','uHover','uTouches[0]','uImpacts[0]','uCore','uMotion','uLocal','uCamera','uCenter','uZoom','uHasDepth'];
  return {program,uniforms:Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(program,name)]))};
 }
 function bufferFor(data,usage=gl.STATIC_DRAW){const buffer=gl.createBuffer();buffers.push(buffer);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,usage);return buffer;}
 try{
  const depthWrite=hasDepth?'gl_FragDepthEXT=hit?clamp((-rd.z*t-.1)/15.9,0.,1.):1.;':'';
  const surfaceFragment=(hasDepth?'#extension GL_EXT_frag_depth : enable\n':'')+fragmentSource.replace('// DEPTH_WRITE',depthWrite);
  const surface=programFor(vertexSource,surfaceFragment),fragments=programFor(particleVertexSource,particleFragmentSource);
  const triangle=bufferFor(new Float32Array([-1,-1,3,-1,-1,3]));
  const particleBuffer=bufferFor(22000*12*4,gl.DYNAMIC_DRAW);
  const positionAttribute=gl.getAttribLocation(surface.program,'aPosition');
  const particleAttributes=['aPositionState','aVelocityState','aRestState'].map(name=>gl.getAttribLocation(fragments.program,name));
  function uniformsFor(target,time,progress,pointer,touches,pose){
   gl.useProgram(target.program);const u=target.uniforms;
   gl.uniform2f(u.uResolution,canvas.width,canvas.height);gl.uniform1f(u.uTime,time);gl.uniform1f(u.uProgress,progress);
   gl.uniform2f(u.uPointer,pointer.x,pointer.y);gl.uniform1f(u.uHover,pointer.active||0);gl.uniform4fv(u['uTouches[0]'],touches);
   gl.uniform1fv(u['uImpacts[0]'],trail.impacts);gl.uniform4fv(u.uCore,core);gl.uniform4fv(u.uMotion,motion);
   // Row-major world rotation is the column-major inverse rotation for GLSL.
   gl.uniformMatrix3fv(u.uLocal,false,pose.matrix);
   gl.uniform3f(u.uCamera,0,pose.cameraY,pose.cameraZ);gl.uniform2f(u.uCenter,pose.centerX,pose.centerY);gl.uniform1f(u.uZoom,pose.zoom);gl.uniform1f(u.uHasDepth,hasDepth?1:0);
  }
  canvas.dataset.particleEngine='inertial-3d';canvas.dataset.depthOcclusion=hasDepth?'depth-buffer':'surface-fallback';
  return {
   resize(nextWidth,nextHeight){
    width=nextWidth;height=nextHeight;
    const ratio=Math.min(devicePixelRatio||1,width<700?1.1:1,1100/width);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);gl.viewport(0,0,canvas.width,canvas.height);
    const count=width<700?6000:18000;
    if(!simulation||simulation.count!==count)simulation=createParticleSimulation({count,maxActive:width<700?1200:3200});else simulation.reset();
    trail.reset();previousTime=null;physicalCore=null;heldPointer={x:0,y:0,active:0,speed:0};
   },
   draw(time,progress,pointer,moving=true){
    if(gl.isContextLost()||!simulation)return;
    const dt=previousTime===null?0:Math.max(0,Math.min(.05,time-previousTime));previousTime=time;
    if(moving)heldPointer={...pointer};const effectPointer=moving?pointer:heldPointer;
    const pose=makeScenePose(time,progress,effectPointer,width,height);
    const x=(effectPointer.rawX??effectPointer.x)*.5*width/height,y=-(effectPointer.rawY??effectPointer.y)*.5;
    const speed=effectPointer.rawSpeed??effectPointer.speed??0,response=cursorResponse(speed);
    const activity=effectPointer.rawActive??effectPointer.active??0;
    const touches=trail.advance(time,x,y,activity,Math.min(130,height*.17)/height,moving,speed);
    core.set([x,y,Math.min(response.corePixels,height*.105)/height,activity>.35?1:effectPointer.active||0]);
    motion.set([Math.max(response.impact,...trail.impacts),effectPointer.velocityX||0,effectPointer.velocityY||0,0]);
    if(moving||!physicalCore)physicalCore=locateCursorCore(x,y,core[2],core[3],pose,physicalCore,dt);
    let drawCount=0;
    if(core[3]>.01||simulation.hasActive||touches.some((value,index)=>index%4===2&&value>.005)){
     drawCount=simulation.update({dt,pose,core:physicalCore,touches,impacts:trail.impacts,pointer:effectPointer,moving});
     for(let zone=0;zone<5;zone++)touches[zone*4+2]=Math.max(touches[zone*4+2],simulation.recovery[zone]);
    }
    gl.depthMask(true);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    if(hasDepth){gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);}else gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);uniformsFor(surface,time,progress,effectPointer,touches,pose);
    gl.bindBuffer(gl.ARRAY_BUFFER,triangle);gl.enableVertexAttribArray(positionAttribute);gl.vertexAttribPointer(positionAttribute,2,gl.FLOAT,false,0,0);
    particleAttributes.forEach(attribute=>{if(attribute!==positionAttribute)gl.disableVertexAttribArray(attribute);});
    gl.drawArrays(gl.TRIANGLES,0,3);
    if(drawCount){
     uniformsFor(fragments,time,progress,effectPointer,touches,pose);
     gl.bindBuffer(gl.ARRAY_BUFFER,particleBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,simulation.renderData.subarray(0,drawCount*12));
     particleAttributes.forEach((attribute,index)=>{gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,4,gl.FLOAT,false,48,index*16);});
     gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.drawArrays(gl.POINTS,0,drawCount);gl.disable(gl.BLEND);gl.depthMask(true);
    }
    canvas.dataset.activeFragments=String(drawCount);
   }
  };
 }catch(error){
  console.warn('La escena usa su alternativa estática.',error.message);
  buffers.forEach(buffer=>gl.deleteBuffer(buffer));programs.forEach(program=>gl.deleteProgram(program));shaders.forEach(shader=>gl.deleteShader(shader));return null;
 }
}
