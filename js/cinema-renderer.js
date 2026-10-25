import { cursorResponse } from './cinema-particles.js';
import { createParticleSimulation, makeScenePose, locateCursorCore } from './particle-physics.js';

const commonSource=`
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uProgress;
uniform vec2 uPointer;
uniform float uHover;
uniform vec4 uCuts[24];
uniform int uCutCount;
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
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
`;

const vertexSource=`attribute vec2 aPosition;void main(){gl_Position=vec4(aPosition,0.,1.);}`;
const fragmentSource=commonSource+`

float beamX(){return sin(uTime*.32)*.11;}
float beamDistance(vec3 p){
 vec2 d=vec2(length(p.xz-vec2(beamX(),1.25))-.010,abs(p.y)-1.54);
 return min(max(d.x,d.y),0.)+length(max(d,0.));
}
vec2 mapScene(vec3 p){
 vec3 local=localPoint(p);
 float body=rawShape(local);
 // Hard Boolean cuts in object space: no ambient deformation or screen mask.
 for(int i=0;i<24;i++){
  if(i>=uCutCount)break;
  if(uCuts[i].w>.001){
   vec3 delta=local-uCuts[i].xyz;
   float chip=length(delta)-uCuts[i].w;
   // Stationary fracture facets, attached to the body.
   float facet=max(abs(dot(delta,normalize(vec3(.8,.3,.6)))),abs(dot(delta,normalize(vec3(-.4,.9,.2)))))-uCuts[i].w*.86;
   body=max(body,-max(chip,facet));
  }
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

 vec3 ro=gCamera,rd=normalize(vec3(uv*1.8/gZoom,-2.4));
 vec3 color=vec3(.016,.026,.035)+vec3(.06,.13,.12)*exp(-length(uv*vec2(.85,1.))*2.5);
 float t=0.;vec2 sampleValue=vec2(0.);bool hit=false;
 for(int i=0;i<100;i++){
  sampleValue=mapScene(ro+rd*t);
  if(sampleValue.x<.0015){hit=true;break;}
  t+=max(sampleValue.x*.65,.002);
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
 color+=vec3(.27,.65,.49)*coreGlow*uCore.w*.025;
 color+=vec3((hash(vec3(gl_FragCoord.xy,0.))-.5)*.007);
 color*=1.-.24*pow(length((gl_FragCoord.xy/uResolution-.5)*1.2),2.);
 color=pow(vec3(1.)-exp(-max(color,0.)*1.35),vec3(.88));
 gl_FragColor=vec4(color,1.);
 // DEPTH_WRITE
}`;


const particleVertexSource=commonSource+`
attribute vec3 aCorner;attribute vec3 aNormal;
attribute vec4 aPositionState;attribute vec4 aVelocityState;attribute vec4 aRestState;
varying vec3 vNormal;varying vec3 vView;varying float vTint;varying float vOpacity;
mat3 shardRotation(float seed){
 float a=seed*31.4+uTime*(.35+seed*.9),b=seed*13.7+uTime*(.2+seed*.5);
 float ca=cos(a),sa=sin(a),cb=cos(b),sb=sin(b);
 return mat3(ca,sa,0.,-sa*cb,ca*cb,sb,sa*sb,-ca*sb,cb);
}
void main(){
 setupCamera();mat3 rotation=shardRotation(aRestState.w);
 vec3 position=aPositionState.xyz+rotation*aCorner*aVelocityState.w;
 vec2 projected=projectPoint(position);
 float depth=clamp((gCamera.z-position.z-.1)/15.9,0.,1.);
 gl_Position=vec4(projected*vec2(2.*uResolution.y/uResolution.x,2.),depth*2.-1.,1.);
 vNormal=rotation*aNormal;vView=normalize(gCamera-position);vTint=aRestState.w;vOpacity=aPositionState.w;
 if(uHasDepth<.5&&rawShape(localPoint(position))<-.035)vOpacity=0.;
 if(vOpacity<.01)gl_Position=vec4(3.,3.,0.,1.);
}`;
const particleFragmentSource=`
precision mediump float;
varying vec3 vNormal;varying vec3 vView;varying float vTint;varying float vOpacity;
void main(){
 vec3 normal=normalize(vNormal);if(!gl_FrontFacing)normal=-normal;
 vec3 light=normalize(vec3(-.7,1.,1.));
 float diffuse=max(dot(normal,light),0.);
 float spec=pow(max(dot(reflect(-light,normal),normalize(vView)),0.),32.);
 float rim=pow(1.-abs(dot(normal,normalize(vView))),3.);
 vec3 metal=mix(vec3(.25,.42,.32),vec3(.70,.64,.43),step(.88,vTint));
 vec3 color=metal*(.5+diffuse*.9)+vec3(.72,.94,.78)*spec*.9+vec3(.25,.41,.32)*rim*.4;
 gl_FragColor=vec4(color,vOpacity);
}`;

// Eight flat-shaded faces make each fragment a solid irregular chip.
function shardGeometry(){
 const points=[[0,1.1,0],[0,-.72,0],[1,0,0],[0,0,.68],[-.84,0,0],[0,0,-.78]],data=[];
 for(const face of [[0,2,3],[0,3,4],[0,4,5],[0,5,2],[1,3,2],[1,4,3],[1,5,4],[1,2,5]]){
  const [a,b,c]=face.map(i=>points[i]),u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);
  const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...n);
  for(const point of [a,b,c])data.push(...point,...n.map(value=>value/length));
 }
 return new Float32Array(data);
}

export function createCinemaRenderer(canvas) {
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:true,powerPreference:'low-power'});
 if(!gl)return null;
 const hasDepth=Boolean(gl.getExtension('EXT_frag_depth'));
 const instancing=gl.getExtension('ANGLE_instanced_arrays');
 const shaders=[],programs=[],buffers=[];
 const core=new Float32Array(4),motion=new Float32Array(4);
 let width=1,height=1,simulation=null,previousTime=null,physicalCore=null,previousScreen=null,orbitDepth=null;
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
  const names=['uResolution','uTime','uProgress','uPointer','uHover','uCuts[0]','uCutCount','uCore','uMotion','uLocal','uCamera','uCenter','uZoom','uHasDepth'];
  return {program,uniforms:Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(program,name)]))};
 }
 function bufferFor(data,usage=gl.STATIC_DRAW){const buffer=gl.createBuffer();buffers.push(buffer);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,usage);return buffer;}
 try{
  const depthWrite=hasDepth?'gl_FragDepthEXT=hit?clamp((-rd.z*t-.1)/15.9,0.,1.):1.;':'';
  const surfaceFragment=(hasDepth?'#extension GL_EXT_frag_depth : enable\n':'')+fragmentSource.replace('// DEPTH_WRITE',depthWrite);
  const surface=programFor(vertexSource,surfaceFragment),fragments=programFor(particleVertexSource,particleFragmentSource);
  const triangle=bufferFor(new Float32Array([-1,-1,3,-1,-1,3]));
  const particleBuffer=bufferFor(2400*12*4,gl.DYNAMIC_DRAW);
  const geometry=shardGeometry(),chipBuffer=bufferFor(geometry);
  const expanded=new Float32Array(2400*24*18),fallbackBuffer=instancing?null:bufferFor(expanded.byteLength,gl.DYNAMIC_DRAW);
  const cornerAttribute=gl.getAttribLocation(fragments.program,'aCorner'),normalAttribute=gl.getAttribLocation(fragments.program,'aNormal');
  const positionAttribute=gl.getAttribLocation(surface.program,'aPosition');
  const particleAttributes=['aPositionState','aVelocityState','aRestState'].map(name=>gl.getAttribLocation(fragments.program,name));
  function uniformsFor(target,time,progress,pointer,pose){
   gl.useProgram(target.program);const u=target.uniforms;
   gl.uniform2f(u.uResolution,canvas.width,canvas.height);gl.uniform1f(u.uTime,time);gl.uniform1f(u.uProgress,progress);
   gl.uniform2f(u.uPointer,pointer.x,pointer.y);gl.uniform1f(u.uHover,pointer.active||0);gl.uniform4fv(u['uCuts[0]'],simulation.cuts);gl.uniform1i(u.uCutCount,simulation.cutCount);
   gl.uniform4fv(u.uCore,core);gl.uniform4fv(u.uMotion,motion);
   // Row-major world rotation is the column-major inverse rotation for GLSL.
   gl.uniformMatrix3fv(u.uLocal,false,pose.matrix);
   gl.uniform3f(u.uCamera,0,pose.cameraY,pose.cameraZ);gl.uniform2f(u.uCenter,pose.centerX,pose.centerY);gl.uniform1f(u.uZoom,pose.zoom);gl.uniform1f(u.uHasDepth,hasDepth?1:0);
  }
  canvas.dataset.particleEngine='orbital-solid-chips';canvas.dataset.depthOcclusion=hasDepth?'depth-buffer':'surface-fallback';canvas.dataset.fragmentGeometry=instancing?'instanced-mesh':'expanded-mesh';
  return {
   resize(nextWidth,nextHeight){
    width=nextWidth;height=nextHeight;
    const ratio=Math.min(devicePixelRatio||1,width<700?1.1:1,1100/width);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);gl.viewport(0,0,canvas.width,canvas.height);
    const count=width<700?9000:26000;
    if(!simulation||simulation.count!==count)simulation=createParticleSimulation({count,maxActive:width<700?700:2000});else simulation.reset();
    previousTime=null;physicalCore=null;previousScreen=null;orbitDepth=null;heldPointer={x:0,y:0,active:0,speed:0};
   },
   draw(time,progress,pointer,moving=true){
    if(gl.isContextLost()||!simulation)return;
    const dt=previousTime===null?0:Math.max(0,Math.min(.05,time-previousTime));previousTime=time;
    if(moving)heldPointer={...pointer};const effectPointer=moving?pointer:heldPointer;
    const pose=makeScenePose(time,progress,effectPointer,width,height);
    const x=(effectPointer.rawX??effectPointer.x)*.5*width/height,y=-(effectPointer.rawY??effectPointer.y)*.5;
    const speed=effectPointer.rawSpeed??effectPointer.speed??0,response=cursorResponse(speed);
    const activity=effectPointer.rawActive??effectPointer.active??0;
    core.set([x,y,response.corePixels/height,activity>.35?1:0]);
    motion.set([response.impact,effectPointer.velocityX||0,effectPointer.velocityY||0,0]);
    const contacts=[];
    if(moving){
     const sample=locateCursorCore(x,y,core[2],core[3],pose,physicalCore,dt);
     const travel=previousScreen?Math.hypot(x-previousScreen.x,y-previousScreen.y):0;
     // Only actual cursor travel fractures the body. Rotation, hovering and
     // pre-existing craters can never release additional fragments.
     if(core[3]>.5&&previousScreen?.active&&travel>.00015&&travel<1.8){
      const steps=Math.min(16,Math.max(1,Math.ceil(travel/(core[2]*.7))));
      for(let step=1;step<=steps;step++){
       const t=step/steps,hit=locateCursorCore(previousScreen.x+(x-previousScreen.x)*t,previousScreen.y+(y-previousScreen.y)*t,core[2],1,pose);
       if(hit.hit)contacts.push({...hit,impact:response.impact});
      }
     }
     // Keep the orbital plane stable when the ray crosses a hollow in the piece.
     if(core[3]<.5)orbitDepth=null;
     if(orbitDepth===null&&contacts.length)orbitDepth=contacts[0].center[2];
     const z=orbitDepth??sample.center[2];
     const plane=(pose.cameraZ-z)*1.8/(2.4*pose.zoom);
     const center=new Float64Array([(x-pose.centerX)*plane,pose.cameraY+(y-pose.centerY)*plane,z]);
     const velocity=new Float64Array(3);
     if(physicalCore&&dt>0&&core[3]>.5&&physicalCore.strength>.5){
      for(let axis=0;axis<3;axis++)velocity[axis]=(center[axis]-physicalCore.center[axis])/dt;
      const speed=Math.hypot(...velocity);if(speed>4)for(let axis=0;axis<3;axis++)velocity[axis]*=4/speed;
     }
     physicalCore={center,velocity,radius:core[2]*plane,strength:core[3],hit:sample.hit};
     previousScreen={x,y,active:core[3]>.5};
    }
    if(!physicalCore)physicalCore=locateCursorCore(x,y,core[2],core[3],pose);
    const drawCount=simulation.update({dt,pose,core:physicalCore,contacts,pointer:effectPointer,moving});
    gl.depthMask(true);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    if(hasDepth){gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);}else gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);uniformsFor(surface,time,progress,effectPointer,pose);
    gl.bindBuffer(gl.ARRAY_BUFFER,triangle);gl.enableVertexAttribArray(positionAttribute);gl.vertexAttribPointer(positionAttribute,2,gl.FLOAT,false,0,0);
    [...particleAttributes,cornerAttribute,normalAttribute].forEach(attribute=>{if(instancing)instancing.vertexAttribDivisorANGLE(attribute,0);if(attribute!==positionAttribute)gl.disableVertexAttribArray(attribute);});
    gl.drawArrays(gl.TRIANGLES,0,3);
    if(drawCount){
     uniformsFor(fragments,time,progress,effectPointer,pose);
     gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.disable(gl.BLEND);
     if(instancing){
      gl.bindBuffer(gl.ARRAY_BUFFER,chipBuffer);
      for(const [attribute,offset]of[[cornerAttribute,0],[normalAttribute,12]]){gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,3,gl.FLOAT,false,24,offset);instancing.vertexAttribDivisorANGLE(attribute,0);}
      gl.bindBuffer(gl.ARRAY_BUFFER,particleBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,simulation.renderData.subarray(0,drawCount*12));
      particleAttributes.forEach((attribute,index)=>{gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,4,gl.FLOAT,false,48,index*16);instancing.vertexAttribDivisorANGLE(attribute,1);});
      instancing.drawArraysInstancedANGLE(gl.TRIANGLES,0,24,drawCount);
      particleAttributes.forEach(attribute=>instancing.vertexAttribDivisorANGLE(attribute,0));
     }else{
      for(let i=0;i<drawCount;i++)for(let vertex=0;vertex<24;vertex++){
       const offset=(i*24+vertex)*18;expanded.set(geometry.subarray(vertex*6,vertex*6+6),offset);expanded.set(simulation.renderData.subarray(i*12,i*12+12),offset+6);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER,fallbackBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,expanded.subarray(0,drawCount*24*18));
      for(const [attribute,size,offset]of[[cornerAttribute,3,0],[normalAttribute,3,12],...particleAttributes.map((attribute,index)=>[attribute,4,24+index*16])]){gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,size,gl.FLOAT,false,72,offset);}
      gl.drawArrays(gl.TRIANGLES,0,drawCount*24);
     }
    }
    canvas.dataset.activeFragments=String(drawCount);
   }
  };
 }catch(error){
  console.warn('La escena usa su alternativa estática.',error.message);
  buffers.forEach(buffer=>gl.deleteBuffer(buffer));programs.forEach(program=>gl.deleteProgram(program));shaders.forEach(shader=>gl.deleteShader(shader));return null;
 }
}
