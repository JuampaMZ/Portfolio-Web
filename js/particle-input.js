import {PARTICLE_CONFIG as config} from './particle-config.js';
// Fixed-size input history only. Individual particle state never enters JS.
export function createParticleInput(){
 const controller=new AbortController(),spots=[],uniforms=new Float32Array(32);let pointerId=null;
 const on=(target,event,handler)=>target.addEventListener(event,handler,{passive:true,signal:controller.signal});
 function record(event){
  if(event.pointerType!=='mouse'&&event.type!=='pointerdown'&&pointerId!==event.pointerId)return;
  const now=performance.now(),previous=spots[0];
  const distance=previous?Math.hypot(event.clientX-previous.x,event.clientY-previous.y):0;
  if(!previous||distance>config.repulsionRadius*.18||now-previous.time>45){
   spots.unshift({x:event.clientX,y:event.clientY,time:now,held:true});if(spots.length>8)spots.pop();
  }else{previous.x=event.clientX;previous.y=event.clientY;previous.time=now;previous.held=true;}
  if(event.pointerType!=='mouse')pointerId=event.pointerId;
  for(let i=1;i<spots.length;i++)spots[i].held=false;
 }
 function release(event){if(event?.pointerType==='mouse'&&event.type==='pointerup')return;pointerId=null;spots.forEach(spot=>{spot.held=false;});}
 on(window,'pointerdown',record);on(window,'pointermove',record);on(window,'pointerup',release);on(window,'pointercancel',release);
 // Passive touchmove preserves the wake after browsers hand vertical pans to native scrolling.
 on(window,'touchmove',event=>{const touch=event.touches[0];if(touch)record({clientX:touch.clientX,clientY:touch.clientY,pointerType:'touch',pointerId:touch.identifier,type:'pointerdown'});});on(window,'touchend',release);
 on(document,'pointerleave',release);on(window,'blur',release);
 return {
  sample(width,height,top=0,left=0,enabled=true){
   uniforms.fill(0);if(!enabled)return uniforms;const now=performance.now();
   spots.slice(0,Math.min(8,config.trailCapacity)).forEach((spot,i)=>{
    const strength=spot.held&&i===0?1:Math.exp(-(now-spot.time)/(config.trailSeconds*1000)*3.5);
    if(strength>.004)uniforms.set([(spot.x-left-width*.5)/height,(height*.5-spot.y+top)/height,strength,1],i*4);
   });return uniforms;
  },
  dispose(){controller.abort();spots.length=0;uniforms.fill(0);}
 };
}
