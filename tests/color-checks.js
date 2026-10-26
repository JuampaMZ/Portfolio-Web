import * as THREE from '../assets/three-runtime.js';
export function verifyColorFrame(core,canvas,time=50){
 const {renderer,particles,beam,composer,bloom,camera,state}=core.inspect,gl=renderer.getContext(),rows=[];
 const assert=(ok,label)=>{if(!ok)throw Error(label);rows.push(label);};
 core.setDebug(false);core.draw(time);
 assert(renderer.outputColorSpace===THREE.SRGBColorSpace&&renderer.toneMapping===THREE.NoToneMapping,'Salida sRGB sin ACES en el pase final');
 assert(particles.material.toneMapped===false&&beam.material.toneMapped===false,'Materiales de partículas y rayo sin tone mapping');
 assert(particles.material.depthTest&&particles.material.depthWrite&&particles.material.blending===THREE.NormalBlending&&beam.material.depthWrite,'Técnica de profundidad conservada: alfa normal y depth buffer');
 const pixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
 let white=0,green=0,hot=0,halo=0;
 const top=beam.localToWorld(new THREE.Vector3(0,.5,0)).project(camera),bottom=beam.localToWorld(new THREE.Vector3(0,-.5,0)).project(camera),a=[(top.x*.5+.5)*canvas.width,(top.y*.5+.5)*canvas.height],d=[(bottom.x-top.x)*.5*canvas.width,(bottom.y-top.y)*.5*canvas.height],dd=d[0]*d[0]+d[1]*d[1];
 for(let i=0;i<pixels.length;i+=4){const [r,g,b]=pixels.subarray(i,i+3);if(r>=250&&g>=250&&b>=250)white++;if(g>225&&r<180&&b<120)green++;if(g>=248&&r>=225&&b>=205&&g>r+4&&g>b+6)hot++;
  if(g>r+15&&g>b+15&&g>30){const n=i/4,x=n%canvas.width,y=Math.floor(n/canvas.width),t=Math.max(0,Math.min(1,((x-a[0])*d[0]+(y-a[1])*d[1])/dd)),distance=Math.hypot(x-a[0]-d[0]*t,y-a[1]-d[1]*t);if(distance>12&&distance<60)halo++;}}
 assert(white>300,'Centros blancos de anillo en sRGB: '+white+' píxeles ≥250 en R/G/B');
 assert(green>30&&hot>8,'Cuerpo verde nuclear y centro casi blanco verdoso: '+green+' / '+hot+' píxeles');
 assert(halo>50,'Bloom verde alrededor del rayo: '+halo+' píxeles fuera del cuerpo');
 const oldVisible=beam.visible,oldRange={...particles.geometry.drawRange},oldBloom=bloom.enabled;
 let best=null;
 try{
  beam.visible=false;bloom.enabled=false;
  const positions=new Float32Array(32*3);gl.bindBuffer(gl.ARRAY_BUFFER,state.position);gl.getBufferSubData(gl.ARRAY_BUFFER,0,positions);gl.bindBuffer(gl.ARRAY_BUFFER,null);
  for(let index=0;index<32;index++){
   const p=new THREE.Vector3(...positions.slice(index*3,index*3+3)).project(camera),x=Math.round((p.x*.5+.5)*canvas.width),y=Math.round((p.y*.5+.5)*canvas.height),side=24;
   if(x<12||y<12||x>=canvas.width-12||y>=canvas.height-12)continue;
   particles.geometry.setDrawRange(index,1);composer.render();const patch=new Uint8Array(side*side*4);gl.readPixels(x-12,y-12,side,side,gl.RGBA,gl.UNSIGNED_BYTE,patch);
   let peak=0,peakColor=[],bright=0,minX=24,maxX=-1,minY=24,maxY=-1,soft=0;
   for(let i=0;i<patch.length;i+=4){const r=patch[i],g=patch[i+1],b=patch[i+2],alpha=patch[i+3];if(Math.min(r,g,b)>peak){peak=Math.min(r,g,b);peakColor=[r,g,b];}if(r>=250&&g>=250&&b>=250)bright++;if(alpha>5){minX=Math.min(minX,i/4%side);maxX=Math.max(maxX,i/4%side);minY=Math.min(minY,Math.floor(i/4/side));maxY=Math.max(maxY,Math.floor(i/4/side));}if(alpha>5&&alpha<180)soft++;}
   if(peak>=250&&bright>0){best={peak,peakColor,bright,soft,width:maxX-minX+1,height:maxY-minY+1};break;}
  }
  assert(best&&Math.max(...best.peakColor)-Math.min(...best.peakColor)<=1,'Partícula aislada sin tinte: RGB '+JSON.stringify(best?.peakColor));
  assert(best.width<=Math.ceil(8*Number(canvas.dataset.pixelRatio))&&best.height<=Math.ceil(8*Number(canvas.dataset.pixelRatio))&&best.soft>0,'Núcleo definido y halo local pequeño: '+best.width+'×'+best.height+' px');
 }finally{beam.visible=oldVisible;particles.geometry.setDrawRange(oldRange.start,oldRange.count);bloom.enabled=oldBloom;core.draw(time);}
 assert(gl.getError()===gl.NO_ERROR,'Sin errores WebGL durante la comprobación de color');
 return rows;
}
