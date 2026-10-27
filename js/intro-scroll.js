// Wheel events arrive in large, irregular steps on desktop mice. Keep native touch,
// keyboard and anchor navigation; only ease wheel travel inside the opening story.
export function createWheelSmoother(seconds=.12){
 let current=0,target=0,active=false;
 return {get active(){return active;},get target(){return target;},
  push(delta,position,max){if(!active)current=target=position;else if(delta*(target-current)<0)target=current;target=Math.max(0,Math.min(max,target+delta));active=Math.abs(target-current)>.1;},
  step(dt){if(!active)return current;current+=(target-current)*(1-Math.exp(-Math.max(0,dt)/seconds));if(Math.abs(target-current)<.15){current=target;active=false;}return current;},
  cancel(position){current=target=position;active=false;}
 };
}
export function createIntroWheel(section,config){
 const fine=matchMedia('(pointer:fine) and (hover:hover)'),controller=new AbortController(),model=createWheelSmoother(config.desktopWheelSmoothing);let written=scrollY;
 const cancel=()=>model.cancel(written=scrollY);
 window.addEventListener('wheel',event=>{
  if(!fine.matches||event.ctrlKey||event.metaKey||event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||event.defaultPrevented)return;
  if(event.target.closest?.('input,textarea,select,[contenteditable],.lil-gui,.is-open'))return;
  const r=section.getBoundingClientRect();if(r.top>1||r.bottom<=innerHeight+1)return;
  if(model.active&&Math.abs(scrollY-written)>3)cancel();
  const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);if(!delta)return;
  const max=Math.max(0,document.documentElement.scrollHeight-innerHeight);
  if((delta<0&&scrollY<=0)||(delta>0&&scrollY>=max))return;
  event.preventDefault();model.push(delta,scrollY,max);
 },{passive:false,signal:controller.signal});
 for(const event of ['pointerdown','keydown','blur'])window.addEventListener(event,cancel,{passive:true,signal:controller.signal});
 return {get enabled(){return fine.matches;},step(dt){if(!model.active)return false;const next=model.step(dt);window.scrollTo({top:next,behavior:'instant'});written=scrollY;return true;},dispose(){controller.abort();cancel();}};
}
