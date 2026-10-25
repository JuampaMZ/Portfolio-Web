// Sampling happens only on initialization and resize, never during animation.
export function sampleShapePixels({data,width,height},count,seed=72819) {
  const candidates=[];
  for(let pixel=0;pixel<width*height;pixel++)if(data[pixel*4+3]>128)candidates.push(pixel);
  if(!candidates.length)throw new Error('La silueta no contiene píxeles visibles.');
  let state=seed>>>0;
  const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};
  const homes=new Float32Array(count*4);
  for(let i=0;i<count;i++){
    const pixel=candidates[Math.floor(random()*candidates.length)],offset=pixel*4,o=i*4;
    homes[o]=((pixel%width)+random())/width-.5;
    homes[o+1]=.5-(Math.floor(pixel/width)+random())/height;
    homes[o+2]=(data[offset+2]/255-.5)*.32;
    homes[o+3]=data[offset]/255;
  }
  return homes;
}

// Rasterize the original intertwined sculpture once. Its pixels, not a generic
// sphere or an SVG substitute, become the particle anchors.
export function rasterizeSculpture(size=384) {
  const source=document.createElement('canvas');source.width=size;source.height=size;
  const gl=source.getContext('webgl',{alpha:true,antialias:false,preserveDrawingBuffer:true});
  if(!gl)throw new Error('No se pudo preparar la silueta.');
  const vertex='attribute vec2 aPosition;void main(){gl_Position=vec4(aPosition,0.,1.);}';
  const fragment=`
precision highp float;
uniform float uSize;
mat2 rotate(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
float ribbon(vec3 p,float phase){
 float a=atan(p.z,p.x),r=1.23+.13*sin(a*3.+phase);
 vec2 q=vec2(length(p.xz)-r,p.y-.24*sin(a*2.+phase));q=rotate(a*1.5+phase)*q;
 return (length(q/vec2(.22,.38))-1.)*.20;
}
float shape(vec3 p){
 p.xz=rotate(.32)*p.xz;p.xy=rotate(-.40)*p.xy;p.yz=rotate(.45)*p.yz;
 float a=ribbon(p,0.);vec3 q=p;q.yz=rotate(1.2)*q.yz;q.xy=rotate(.5)*q.xy;
 float b=ribbon(q,2.1),h=clamp(.5+.5*(b-a)/.12,0.,1.);
 return mix(b,a,h)-.12*h*(1.-h);
}
void main(){
 vec2 uv=(gl_FragCoord.xy/uSize-.5)*3.8;
 vec3 ro=vec3(0.,.08,5.5),rd=normalize(vec3(uv,-5.5));float t=0.;bool hit=false;
 for(int i=0;i<110;i++){float d=shape(ro+rd*t);if(d<.002){hit=true;break;}t+=max(d*.75,.003);if(t>9.)break;}
 if(!hit){gl_FragColor=vec4(0.);return;}
 vec3 p=ro+rd*t;vec2 e=vec2(.002,0.);
 vec3 n=normalize(vec3(shape(p+e.xyy)-shape(p-e.xyy),shape(p+e.yxy)-shape(p-e.yxy),shape(p+e.yyx)-shape(p-e.yyx)));
 float shade=.25+.58*max(dot(n,normalize(vec3(-.6,.9,1.))),0.)+.17*pow(1.-max(dot(-rd,n),0.),2.);
 gl_FragColor=vec4(shade,0.,clamp((p.z+2.)/4.,0.,1.),1.);
}`;
  const program=gl.createProgram(),shaders=[];let buffer=null;
  try{
    for(const [type,code]of[[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
      const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,code);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));gl.attachShader(program,shader);
    }
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const attribute=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
    gl.uniform1f(gl.getUniformLocation(program,'uSize'),size);gl.viewport(0,0,size,size);gl.drawArrays(gl.TRIANGLES,0,3);
    const offscreen=document.createElement('canvas');offscreen.width=size;offscreen.height=size;
    const context=offscreen.getContext('2d',{willReadFrequently:true});context.drawImage(source,0,0);
    return context.getImageData(0,0,size,size);
  }finally{
    if(buffer)gl.deleteBuffer(buffer);shaders.forEach(shader=>gl.deleteShader(shader));gl.deleteProgram(program);
    gl.getExtension('WEBGL_lose_context')?.loseContext();source.width=1;source.height=1;
  }
}
