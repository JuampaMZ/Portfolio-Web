// Original full-screen sculpture. No video downloads or third-party runtime.
const vertexSource = `attribute vec2 aPosition;
void main(){gl_Position=vec4(aPosition,0.,1.);}`;

const fragmentSource = `
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uProgress;
uniform vec2 uPointer;
uniform float uHover;
mat2 rotate(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
float smoothUnion(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
vec3 localPoint(vec3 p){
 p.xz=rotate(uProgress*4.8+uTime*.075+uPointer.x*.22)*p.xz;
 p.xy=rotate(-.45+uProgress*1.2)*p.xy;
 p.yz=rotate(.45+sin(uTime*.09)*.14+uPointer.y*.14)*p.yz;
 return p;
}
float ribbon(vec3 p,float phase){
 float a=atan(p.z,p.x);
 float radius=1.23+.13*sin(a*3.+phase);
 vec2 crossSection=vec2(length(p.xz)-radius,p.y-.24*sin(a*2.+phase));
 crossSection=rotate(a*1.5+phase)*crossSection;
 // Elliptical cross-section gives the surface a broad, machined highlight.
 return (length(crossSection/vec2(.22,.38))-1.)*.20;
}
float scene(vec3 p){
 p=localPoint(p);
 float a=ribbon(p,0.);
 vec3 q=p;q.yz=rotate(1.2+uProgress*.5)*q.yz;q.xy=rotate(.5)*q.xy;
 float b=ribbon(q,2.1);
 return smoothUnion(a,b,.12);
}
vec3 normalAt(vec3 p){
 vec2 e=vec2(.002,0.);
 return normalize(vec3(scene(p+e.xyy)-scene(p-e.xyy),scene(p+e.yxy)-scene(p-e.yxy),scene(p+e.yyx)-scene(p-e.yyx)));
}
vec3 environment(vec3 d){
 vec3 color=vec3(.018,.026,.031);
 float strip=pow(max(0.,dot(d,normalize(vec3(-.5,1.,.7)))),24.);
 float soft=pow(max(0.,dot(d,normalize(vec3(1.,.3,-.6)))),7.);
 float edge=pow(max(0.,dot(d,normalize(vec3(-1.,-.15,-.8)))),34.);
 color+=vec3(.91,1.,.81)*strip*2.6;
 color+=vec3(.35,.59,.57)*soft*.8;
 color+=vec3(.91,.66,.37)*edge*1.8;
 return color;
}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*uResolution)/uResolution.y;
 float mobile=1.-step(1.,uResolution.x/uResolution.y);
 vec2 center=mix(vec2(.38,.10),vec2(0.,.23),mobile);
 uv-=center;
 float zoom=1.+.09*sin(uProgress*3.14159);
 vec3 ro=vec3(0.,.08,5.5-1.1*uProgress);
 vec3 rd=normalize(vec3(uv*1.8/zoom,-2.4));
 vec3 color=vec3(.016,.026,.035);
 float halo=exp(-length(uv*vec2(.85,1.))*2.5);
 color+=vec3(.06,.13,.12)*halo;
 float t=0.;float distanceToSurface=0.;bool hit=false;
 for(int i=0;i<84;i++){
   vec3 p=ro+rd*t;distanceToSurface=scene(p);
   if(distanceToSurface<.0015){hit=true;break;}
   t+=max(distanceToSurface*.8,.003);
   if(t>10.)break;
 }
 if(hit){
   vec3 p=ro+rd*t;vec3 n=normalAt(p);vec3 reflected=reflect(rd,n);
   vec3 light=normalize(vec3(-.7,1.,1.));
   float diffuse=max(dot(n,light),0.);
   float fresnel=pow(1.-max(dot(-rd,n),0.),3.);
   vec3 base=mix(vec3(.17,.25,.20),vec3(.43,.56,.40),.5+.5*sin(localPoint(p).y*2.));
   color=base*(.16+diffuse*.22)+environment(reflected)*(.55+fresnel*.6);
   color+=vec3(.57,.77,.52)*pow(max(dot(n,normalize(vec3(.9,-.2,.2))),0.),5.)*.3;
   vec2 cursorUV=vec2(uPointer.x*.5*uResolution.x/uResolution.y,-uPointer.y*.5)-center;
   vec3 cursorLight=vec3(cursorUV*3.5,3.);
   vec3 cursorDirection=normalize(cursorLight-p);
   float cursorSpecular=pow(max(dot(reflect(-cursorDirection,n),-rd),0.),32.);
   float cursorDiffuse=pow(max(dot(n,cursorDirection),0.),4.);
   color+=vec3(.73,.94,.66)*(cursorSpecular*.85+cursorDiffuse*.13)*uHover;
   color=mix(color,vec3(.03,.06,.06),1.-exp(-.014*t*t));
 }
 // Fine photographic grain and a restrained vignette keep the scene tactile.
 color+=vec3((hash(gl_FragCoord.xy)-.5)*.007);
 color*=1.-.24*pow(length((gl_FragCoord.xy/uResolution-.5)*1.2),2.);
 color=vec3(1.)-exp(-color*1.35);
 color=pow(max(color,0.),vec3(.88));
 gl_FragColor=vec4(color,1.);
}`;

export function createCinemaRenderer(canvas) {
  const gl = canvas.getContext('webgl', { alpha:false, antialias:false, depth:false, powerPreference:'low-power' });
  if (!gl) return null;
  const shaders = [];
  let program;
  let buffer;
  try {
    for (const [type, source] of [[gl.VERTEX_SHADER,vertexSource],[gl.FRAGMENT_SHADER,fragmentSource]]) {
      const shader = gl.createShader(type);
      shaders.push(shader);
      gl.shaderSource(shader,source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    }
    program = gl.createProgram();
    shaders.forEach(shader => gl.attachShader(program,shader));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program,'aPosition');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const uniforms = Object.fromEntries(['uResolution','uTime','uProgress','uPointer','uHover'].map(name=>[name,gl.getUniformLocation(program,name)]));
    return {
      resize(width,height) {
        // Bound the shader workload on high-density mobile displays.
        const ratio = Math.min(devicePixelRatio || 1, width < 700 ? 1.1 : 1, 1200 / width);
        canvas.width = Math.round(width*ratio);
        canvas.height = Math.round(height*ratio);
        gl.viewport(0,0,canvas.width,canvas.height);
        gl.uniform2f(uniforms.uResolution,canvas.width,canvas.height);
      },
      draw(time,progress,pointer) {
        if (gl.isContextLost()) return;
        gl.uniform1f(uniforms.uTime,time);
        gl.uniform1f(uniforms.uProgress,progress);
        gl.uniform2f(uniforms.uPointer,pointer.x,pointer.y);
        gl.uniform1f(uniforms.uHover,pointer.active||0);
        gl.drawArrays(gl.TRIANGLES,0,3);
      }
    };
  } catch (error) {
    console.warn('La escena 3D usa su alternativa visual.', error.message);
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    shaders.forEach(shader=>gl.deleteShader(shader));
    return null;
  }
}
