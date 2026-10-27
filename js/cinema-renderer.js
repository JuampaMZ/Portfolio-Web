import {createMeshCore} from './core-mesh-renderer.js';
import {createCanvasCore} from './canvas-core.js';
export function createCinemaRenderer(canvas,{fallbackCanvas,forceFallback=false,...options}={}){
 if(!forceFallback){const full=createMeshCore(canvas,options);if(full)return full;}
 return createCanvasCore(fallbackCanvas);
}
export {PARTICLE_CONFIG,particleBudget} from './particle-config.js';
