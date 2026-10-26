import {PARTICLE_CONFIG as config} from './particle-config.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function isMobileSensorDevice({userAgent='',platform='',maxTouchPoints=0,userAgentData}={}){
 return Boolean(userAgentData?.mobile||/Android|iPhone|iPad|iPod/i.test(userAgent)||(platform==='MacIntel'&&maxTouchPoints>1));
}
const angleDelta=(a,b)=>((a-b+540)%360)-180;
export function relativeTilt(beta,gamma,baseline,screenAngle=0){
 const x=clamp(angleDelta(gamma,baseline.gamma)/config.gyroRange,-1,1),y=clamp(-angleDelta(beta,baseline.beta)/config.gyroRange,-1,1);
 const a=screenAngle*Math.PI/180;return [x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];
}
export function tiltOffset(tilt,intensity,height){
 const length=Math.max(1,Math.hypot(tilt[0],tilt[1])),pixels=Math.min(Math.max(0,intensity),config.gyroMaxDisplacement);
 return [tilt[0]/length*pixels/height,tilt[1]/length*pixels/height];
}
export function createDeviceTilt({win=window,nav=navigator,now=()=>performance.now()}={}){
 const controller=new AbortController(),value=new Float32Array(2),target=new Float32Array(2),sensor=win.DeviceOrientationEvent;
 let baseline=null,last=null,disposed=false,attempted=false,attached=false,activationRetries=0,status='unsupported';
 const on=(name,fn)=>win.addEventListener(name,fn,{passive:true,signal:controller.signal});
 const angle=()=>win.screen?.orientation?.angle??win.orientation??0;
 function receive(event){
  if(!Number.isFinite(event.beta)||!Number.isFinite(event.gamma))return;
  if(!baseline){baseline={beta:event.beta,gamma:event.gamma};status='active';}
  target.set(relativeTilt(event.beta,event.gamma,baseline,angle()));
 }
 function attach(){if(disposed||attached)return;attached=true;status='waiting';on('deviceorientation',receive);}
 function gesture(event){
  if(attempted||disposed||event.pointerType==='mouse'||nav.userActivation?.isActive===false)return;
  attempted=true;status='requesting';
  // Must be invoked synchronously in the first real touch gesture, before await.
  try{Promise.resolve(sensor.requestPermission()).then(result=>{if(disposed)return;if(result==='granted')attach();else status='denied';}).catch(error=>{if(disposed)return;if(error.name==='NotAllowedError'&&activationRetries<1){activationRetries++;attempted=false;status='awaiting-touch';}else status='unavailable';});}
  catch{status='unavailable';}
 }
 if(!config.gyroEnabled||!isMobileSensorDevice(nav))status='desktop';
 else if(sensor){
  if(typeof sensor.requestPermission==='function'){status='awaiting-touch';on('pointerup',gesture);on('touchend',gesture);}
  else attach();
  const recalibrate=()=>{baseline=null;target.fill(0);};on('orientationchange',recalibrate);win.screen?.orientation?.addEventListener?.('change',recalibrate,{passive:true,signal:controller.signal});
 }
 return {
  get status(){return status;},
  sample(){
   const timestamp=now(),dt=last===null?0:clamp((timestamp-last)/1000,0,.05);last=timestamp;
   const alpha=1-Math.exp(-dt/Math.max(.04,config.gyroSmoothing));
   for(let i=0;i<2;i++)value[i]+=(target[i]-value[i])*alpha;
   return value;
  },
  dispose(){if(disposed)return;disposed=true;controller.abort();value.fill(0);target.fill(0);baseline=null;}
 };
}
