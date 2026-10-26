export const gpuMath=`
float random(float n){
 uint x=uint(n)+1u;x^=x>>16u;x*=0x7feb352du;x^=x>>15u;x*=0x846ca68bu;x^=x>>16u;
 return float(x)/4294967295.;
}
vec3 curlNoise(vec3 p,float t){
 vec3 a=vec3(1.7,2.3,1.1),b=vec3(-1.3,1.9,2.7),c=vec3(2.1,-1.5,1.8);
 float ca=cos(dot(p,a)+t),cb=cos(dot(p,b)-t*.73),cc=cos(dot(p,c)+t*.61);
 return vec3(c.y*cc-b.z*cb,a.z*ca-c.x*cc,b.x*cb-a.y*ca)*.27;
}
uniform vec4 uTrail[8];
uniform float uRadius;
uniform float uRepulsion;
vec3 pointerForce(vec3 p){
 vec3 force=vec3(0.);float total=0.;
 for(int i=0;i<8;i++){
  if(uTrail[i].z<.004)continue;
  vec2 away=p.xy-uTrail[i].xy;float distance=length(away);
  float reach=max(.0001,uRadius*uTrail[i].w);if(distance>=reach)continue;float weight=pow(1.-smoothstep(0.,reach,distance),2.)*uTrail[i].z;
  total+=weight;force+=vec3(normalize(away+vec2(.00001,0.)),.12*sin(p.z*31.))*weight*uRepulsion;
 }
 return force/max(1.,total);
}
`;
export const fullscreenVertex=`#version 300 es
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}`;
export const emptyFragment=`#version 300 es
precision highp float;out vec4 color;void main(){color=vec4(0.);}`;
export const rgb=hex=>[1,3,5].map(offset=>parseInt(hex.slice(offset,offset+2),16)/255);
export function createGpuResources(gl){
 const programs=[],shaders=[];let disposed=false;
 return {
  program(vertex,fragment,names,feedback=false){
   const program=gl.createProgram();programs.push(program);
   for(const [type,code]of[[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
    const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,code);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));gl.attachShader(program,shader);
   }
   if(feedback)gl.transformFeedbackVaryings(program,['nextPosition','nextVelocity'],gl.INTERLEAVED_ATTRIBS);
   gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
   return {program,u:Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(program,name)]))};
  },
  dispose(){if(disposed)return;disposed=true;programs.forEach(value=>gl.deleteProgram(value));shaders.forEach(value=>gl.deleteShader(value));}
 };
}
export function createGpuState(gl,count){
 const buffers=[],vaos=[],feedbacks=[];let read=0,disposed=false;
 for(let i=0;i<2;i++){
  const buffer=gl.createBuffer();buffers.push(buffer);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,count*24,gl.DYNAMIC_COPY);
  const vao=gl.createVertexArray();vaos.push(vao);gl.bindVertexArray(vao);
  for(let attr=0;attr<2;attr++){gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,3,gl.FLOAT,false,24,attr*12);}
  const feedback=gl.createTransformFeedback();feedbacks.push(feedback);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,feedback);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);
 }
 gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.bindVertexArray(null);gl.bindBuffer(gl.ARRAY_BUFFER,null);
 return {
  step(){
   gl.enable(gl.RASTERIZER_DISCARD);gl.bindVertexArray(vaos[read]);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,feedbacks[1-read]);
   gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,count);gl.endTransformFeedback();
   gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.disable(gl.RASTERIZER_DISCARD);read=1-read;
  },
  bind(){gl.bindVertexArray(vaos[read]);},
  dispose(){if(disposed)return;disposed=true;gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.bindVertexArray(null);feedbacks.forEach(value=>gl.deleteTransformFeedback(value));vaos.forEach(value=>gl.deleteVertexArray(value));buffers.forEach(value=>gl.deleteBuffer(value));}
 };
}
