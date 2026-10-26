import * as THREE from '../assets/three-runtime.js';
import {interlockedRings} from '../js/particle-motion.js';
export function verifyFrame(core,time,canvas,ringIndex=0){
 const {renderer,scene,camera,beam,particles}=core.inspect,gl=renderer.getContext(),width=canvas.width,height=canvas.height,target=new THREE.WebGLRenderTarget(width,height);
 const old=renderer.getRenderTarget(),messages=[];const assert=(yes,label)=>{if(!yes)throw Error(label);messages.push(label);};
 const frame=()=>{renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);const data=new Uint8Array(width*height*4);renderer.readRenderTargetPixels(target,0,0,width,height,data);return data;};
 const pixel=(data,x,y)=>data.slice((Math.max(0,Math.min(height-1,Math.round(y)))*width+Math.max(0,Math.min(width-1,Math.round(x))))*4,(Math.max(0,Math.min(height-1,Math.round(y)))*width+Math.max(0,Math.min(width-1,Math.round(x))))*4+4);
 const project=p=>{const q=new THREE.Vector3(...p).project(camera);return[(q.x*.5+.5)*width,(q.y*.5+.5)*height];};
 try{
  assert(camera.isPerspectiveCamera&&camera.fov>=40&&camera.fov<=55,'PerspectiveCamera de '+camera.fov+'°');
  assert(beam.geometry.type==='CylinderGeometry'&&beam.material.depthWrite,'Cilindro real con depthWrite');
  assert(particles.material.depthTest&&particles.material.depthWrite&&particles.material.blending===THREE.NormalBlending,'Partículas con depth test y alfa normal');
  const original=particles.visible;particles.visible=false;const rayOnly=frame();particles.visible=original;const together=frame();
  const sceneInfo=interlockedRings(time),d=sceneInfo.pose.direction,center=[0,0,sceneInfo.pose.depth],f=sceneInfo.frames[ringIndex],scale=beam.scale.x/.0055;
  const c=project(center),v=project(center.map((x,j)=>x+d[j]));const direction=[v[0]-c[0],v[1]-c[1]],len=Math.hypot(...direction),normal=[-direction[1]/len,direction[0]/len];
  const point=a=>[0,1,2].map(j=>center[j]+scale*f.radius*(f.basis[j]*Math.cos(a)+f.basis[j+6]*Math.sin(a))),side=a=>{const p=project(point(a));return(p[0]-c[0])*direction[1]-(p[1]-c[1])*direction[0];};
  const crossings=[];
  for(let i=1;i<=720;i++){let lo=(i-1)*Math.PI/360,hi=i*Math.PI/360;if(side(lo)*side(hi)>=0)continue;for(let n=0;n<30;n++){const m=(lo+hi)/2;if(side(lo)*side(m)<0)hi=m;else lo=m;}const world=point((lo+hi)/2),p=project(world),along=world.reduce((s,x,j)=>s+(x-center[j])*d[j],0);crossings.push({p,front:world[2]>center[2]+along*d[2]});}
  for(const {p,front}of crossings){let white=0,covered=0,candidates=0,blue=0;for(let x=-5;x<=5;x++)for(let y=-10;y<=10;y++){const base=pixel(rayOnly,p[0]+x,p[1]+y),color=pixel(together,p[0]+x,p[1]+y);if(base[1]>180){candidates++;if(color[2]>color[0]+35)blue++;if(color[0]>150&&color[1]<80)covered++;if(color[1]>170&&color[1]>=color[0]*.9&&color[1]>=color[2]*.9)white++;}}
   assert(candidates>20,'El rayo alcanza el cruce '+(front?'delantero':'trasero'));
   assert(front?covered>candidates*.5:(particles.material.uniforms.uSingleRing.value>.5?white>candidates*.9:blue<candidates*.05),front?'La banda roja tapa el rayo en el cruce delantero ('+covered+'/'+candidates+' píxeles)':'La banda azul queda oculta en el cruce trasero (puede pasar otra C delante)');
  }
  // Measure the actual rasterized cylinder, with particles hidden and bloom excluded.
  const a=beam.localToWorld(new THREE.Vector3(0,.36,0)),b=beam.localToWorld(new THREE.Vector3(0,-.36,0));
  const widthAt=p=>{const screen=project(p.toArray());let n=0;for(let i=-30;i<=30;i+=.25){const color=pixel(rayOnly,screen[0]+normal[0]*i,screen[1]+normal[1]*i);if(color[1]>180)n+=.25;}return n;};
  const measured=[widthAt(a),widthAt(b)],near=a.z>b.z?0:1,far=1-near;
  assert(measured[near]>measured[far]*1.08,'Ancho medido cercano '+measured[near].toFixed(1)+' px > lejano '+measured[far].toFixed(1)+' px');
  assert(gl.getError()===gl.NO_ERROR,'Sin errores WebGL');
  return messages;
 }finally{renderer.setRenderTarget(old);target.dispose();}
}

