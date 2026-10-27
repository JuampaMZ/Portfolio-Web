// Separate GPU buffers let Three.js consume transform feedback directly.
export function createMeshGpuState(gl,count){
 const slots=[];let read=0,disposed=false;
 for(let i=0;i<2;i++){
  const buffers=Array.from({length:3},()=>gl.createBuffer()),vao=gl.createVertexArray(),feedback=gl.createTransformFeedback();
  gl.bindVertexArray(vao);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,feedback);
  buffers.forEach((buffer,index)=>{gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,count*12,gl.DYNAMIC_COPY);gl.enableVertexAttribArray(index);gl.vertexAttribPointer(index,3,gl.FLOAT,false,12,0);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,index,buffer);});
  slots.push({buffers,vao,feedback});
 }
 gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.bindVertexArray(null);gl.bindBuffer(gl.ARRAY_BUFFER,null);
 return {
  get position(){return slots[read].buffers[0];},
  get velocity(){return slots[read].buffers[1];},
  get anchor(){return slots[read].buffers[2];},
  step(){const target=slots[1-read];gl.enable(gl.RASTERIZER_DISCARD);gl.bindVertexArray(slots[read].vao);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,target.feedback);gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,count);gl.endTransformFeedback();gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.disable(gl.RASTERIZER_DISCARD);gl.bindVertexArray(null);read=1-read;},
  dispose(){if(disposed)return;disposed=true;gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.bindVertexArray(null);slots.forEach(s=>{s.buffers.forEach(b=>gl.deleteBuffer(b));gl.deleteVertexArray(s.vao);gl.deleteTransformFeedback(s.feedback);});}
 };
}
