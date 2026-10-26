import * as THREE from '../assets/three-runtime.js';
import {beamColors} from '../js/beam-colors.js';
import {PARTICLE_CONFIG as config} from '../js/particle-config.js';
export function verifyColorFrame(core,canvas,time=50){
 const {renderer,particles,beam,bloom,composer}=core.inspect,gl=renderer.getContext(),rows=[];
 const assert=(ok,label)=>{if(!ok)throw Error(label);rows.push(label);};
 core.setDebug(false);core.draw(time);
 assert(renderer.outputColorSpace===THREE.SRGBColorSpace&&renderer.toneMapping===THREE.NoToneMapping,'Salida sRGB sin tone mapping');
 assert(!particles.material.toneMapped&&!beam.material.toneMapped,'Ambos materiales conservan toneMapped:false');
 assert(particles.material.depthTest&&particles.material.depthWrite&&particles.material.blending===THREE.NormalBlending&&beam.material.depthWrite,'Alfa normal y depth buffer conservados');
 assert(particles.material.uniforms.uParticleColor.value.toArray().every(v=>v===1),'Base blanca lineal #FFFFFF; luz y sombra proceden del shader esférico');
 const expected=beamColors(time,config),actual=beam.material.uniforms.uColor.value.toArray(),glow=bloom.compositeMaterial.uniforms.uGlowColor.value.toArray();
 assert(actual.every((v,i)=>Math.abs(v-expected.body[i])<1e-6)&&glow.every((v,i)=>Math.abs(v-expected.glow[i])<1e-6),'Cuerpo y bloom siguen la misma transición OKLab');
 const pixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
 let white=0,colored=0;for(let i=0;i<pixels.length;i+=4){const [r,g,b,a]=pixels.subarray(i,i+4);if(a>120&&Math.min(r,g,b)>195&&Math.max(r,g,b)-Math.min(r,g,b)<35)white++;if(a>100&&Math.max(g,b)>150&&r<150)colored++;}
 assert(white>200,'Esferas claras sobre el fondo: '+white+' píxeles blancos iluminados');
 assert(colored>30,'Rayo esmeralda/azul claramente visible: '+colored+' píxeles');
 bloom.enabled=false;composer.render();const withoutBloom=new Uint8Array(pixels.length);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,withoutBloom);bloom.enabled=true;composer.render();
 let halo=0;for(let i=0;i<pixels.length;i+=4)if(withoutBloom[i+3]<20&&Math.max(pixels[i],pixels[i+1],pixels[i+2])>Math.max(withoutBloom[i],withoutBloom[i+1],withoutBloom[i+2])+2)halo++;
 assert(halo>20,'Bloom visible fuera del cuerpo, también en la fase azul: '+halo+' píxeles');
 assert(gl.getError()===gl.NO_ERROR,'Sin errores WebGL en la salida final');return rows;
}
