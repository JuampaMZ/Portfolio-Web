import * as THREE from '../assets/three-runtime.js';
import {beamColors} from '../js/beam-colors.js';import {PARTICLE_CONFIG as config} from '../js/particle-config.js';
export function verifyColorFrame(core,canvas,time=50){
 const {renderer,particles,beam,light,lightUniforms,bloom}=core.inspect,gl=renderer.getContext(),rows=[],assert=(ok,label)=>{if(!ok)throw Error(label);rows.push(label);};
 core.setDebug(false);core.seek(time);
 assert(renderer.outputColorSpace===THREE.SRGBColorSpace&&renderer.toneMapping===THREE.NoToneMapping,'Salida sRGB sin tone mapping');
 assert(!particles.material.toneMapped&&!light.material.toneMapped,'Materiales de luz y esferas sin tone mapping');
 assert(!beam.material.colorWrite&&beam.material.depthWrite,'El proxy invisible solo escribe profundidad');
 assert(particles.material.uniforms.uParticleColor.value.toArray().every(v=>v===1),'Base blanca #FFFFFF');
 const expected=beamColors(time,config),actual=lightUniforms.uColor.value.toArray();assert(actual.every((v,i)=>Math.abs(v-expected.body[i])<1e-6),'Color analítico conserva el ciclo OKLab');
 const data=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,data);let white=0;for(let i=0;i<data.length;i+=4)if(Math.min(data[i],data[i+1],data[i+2])>180&&data[i+3]>80)white++;
 assert(white>100,'Luz y esferas visibles ('+white+' píxeles claros)');assert(canvas.dataset.hdr==='true'?!!bloom:!bloom,'El perfil evita bloom HalfFloat si no corresponde');assert(gl.getError()===0,'Sin errores WebGL');return rows;
}
