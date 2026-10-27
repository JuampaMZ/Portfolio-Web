import * as THREE from '../assets/three-runtime.js';
import {interlockedRings} from '../js/particle-motion.js';
export function verifyFrame(core,time,canvas,ringIndex=0){
 const {renderer,scene,camera,beam,particles,photons,light,cosmicLight,profile}=core.inspect,width=canvas.width,height=canvas.height,target=new THREE.WebGLRenderTarget(width,height),old=renderer.getRenderTarget(),rows=[];
 const saved={pv:particles.visible,lv:light.visible,bv:photons.visible,cv:cosmicLight.visible,cw:beam.material.colorWrite,color:beam.material.color.clone()};
 const assert=(ok,label)=>{if(!ok)throw Error(label);rows.push(label);};
 const frame=()=>{renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);const data=new Uint8Array(width*height*4);renderer.readRenderTargetPixels(target,0,0,width,height,data);return data;};
 const pixel=(data,x,y)=>{x=Math.max(0,Math.min(width-1,Math.round(x)));y=Math.max(0,Math.min(height-1,Math.round(y)));return data.slice((y*width+x)*4,(y*width+x)*4+4);};
 const project=p=>{const q=new THREE.Vector3(...p).project(camera);return[(q.x*.5+.5)*width,(q.y*.5+.5)*height];};
 try{
  assert(camera.isPerspectiveCamera&&camera.fov>=40&&camera.fov<=55,'PerspectiveCamera real de '+camera.fov+'°');
  assert(!beam.material.colorWrite&&beam.material.depthWrite&&beam.material.depthTest,'Cilindro invisible: solo profundidad');
  assert(particles.material.depthWrite&&particles.material.depthTest&&particles.material.blending===THREE.NormalBlending,'Esferas con alfa normal y profundidad');
  cosmicLight.visible=false;particles.visible=false;photons.visible=false;light.visible=false;beam.material.colorWrite=true;beam.material.color.setRGB(1,1,1);const proxy=frame();
  beam.material.colorWrite=false;light.visible=saved.lv;photons.visible=saved.bv;const rayOnly=frame();particles.visible=true;const together=frame();
  const shape=interlockedRings(time,[0,0],1,0,1,profile.ringScale),d=shape.pose.direction,f=shape.frames[ringIndex],scale=Number(canvas.dataset.sceneScale),c=project([0,0,0]),v=project(d),direction=[v[0]-c[0],v[1]-c[1]],len=Math.hypot(...direction),normal=[-direction[1]/len,direction[0]/len];
  const point=a=>[0,1,2].map(j=>scale*f.radius*(f.basis[j]*Math.cos(a)+f.basis[j+6]*Math.sin(a))),side=a=>{const p=project(point(a));return(p[0]-c[0])*direction[1]-(p[1]-c[1])*direction[0];};
  const crossings=[];for(let i=1;i<=720;i++){let lo=(i-1)*Math.PI/360,hi=i*Math.PI/360;if(side(lo)*side(hi)>=0)continue;for(let n=0;n<28;n++){const m=(lo+hi)/2;if(side(lo)*side(m)<0)hi=m;else lo=m;}const world=point((lo+hi)/2),along=world.reduce((s,v,j)=>s+v*d[j],0);crossings.push({p:project(world),front:world[2]>d[2]*along});}
  for(const {p,front}of crossings){let n=0,red=0,blue=0,unchanged=0,proxyCount=0,rayMax=0;for(let x=-5;x<=5;x++)for(let y=-10;y<=10;y++){const a=pixel(rayOnly,p[0]+x,p[1]+y),b=pixel(together,p[0]+x,p[1]+y);if(pixel(proxy,p[0]+x,p[1]+y)[3]>240){proxyCount++;rayMax=Math.max(rayMax,...a.slice(0,3));}if(pixel(proxy,p[0]+x,p[1]+y)[3]<240||Math.max(...a.slice(0,3))<24||a[3]<10)continue;n++;if(b[0]>b[1]+45&&b[0]>b[2]+45)red++;if(b[2]>b[0]+45&&b[0]<150&&b[2]>a[2]+12)blue++;if(Math.hypot(...b.slice(0,3).map((v,j)=>v-a[j]))<7)unchanged++;}
   assert(n>=3,'Luz visible en el cruce '+(front?'delantero':'trasero')+' ('+n+' muestras; proxy '+proxyCount+', luz '+rayMax+', punto '+p.map(x=>x.toFixed(0)).join(',')+')');
   assert(front?red>Math.max(1,n*.10):(particles.material.uniforms.uSingleRing.value>.5?unchanged>n*.80:blue<n*.12),front?'La banda delantera cubre la luz '+canvas.dataset.beamVariant+' ('+red+'/'+n+')':'La banda trasera falla el depth test ('+blue+' fugas azules)');
  }
  // A separate white debug pass measures the physical depth proxy, not the emissive halo.
  particles.visible=false;photons.visible=false;light.visible=false;beam.material.colorWrite=true;beam.material.color.setRGB(1,1,1);
  const a=beam.localToWorld(new THREE.Vector3(0,.36,0)),b=beam.localToWorld(new THREE.Vector3(0,-.36,0)),widthAt=p=>{const q=project(p.toArray());let count=0;for(let i=-18;i<=18;i+=.25)if(pixel(proxy,q[0]+normal[0]*i,q[1]+normal[1]*i)[3]>240)count+=.25;return count;};
  const sizes=[widthAt(a),widthAt(b)],near=a.z>b.z?0:1;const ratio=(camera.position.z-(near===0?b.z:a.z))/(camera.position.z-(near===0?a.z:b.z));assert(ratio>1.05&&sizes[near]>0,'Perspectiva '+ratio.toFixed(2)+'×; proxy rasterizado '+sizes[near].toFixed(2)+' / '+sizes[1-near].toFixed(2)+' px (cuantización subpíxel)');
  assert(renderer.getContext().getError()===0,'Sin errores WebGL');return rows;
 }finally{particles.visible=saved.pv;photons.visible=saved.bv;light.visible=saved.lv;cosmicLight.visible=saved.cv;beam.material.colorWrite=saved.cw;beam.material.color.copy(saved.color);renderer.setRenderTarget(old);target.dispose();}
}
