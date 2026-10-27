// Wait for already-submitted GPU preparation without blocking the main thread.
export function waitForGpu(gl){
 const fence=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);gl.flush();
 return new Promise((resolve,reject)=>{const start=performance.now();const poll=()=>{
  if(gl.isContextLost()){resolve();return;}
  const result=gl.clientWaitSync(fence,0,0);
  if(result===gl.ALREADY_SIGNALED||result===gl.CONDITION_SATISFIED){gl.deleteSync(fence);resolve();}
  else if(result===gl.WAIT_FAILED||performance.now()-start>15000){gl.deleteSync(fence);reject(Error('No se pudo preparar el render GPU.'));}
  else setTimeout(poll,4);
 };poll();});
}
