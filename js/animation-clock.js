// Elapsed wall time, excluding only time spent in a hidden tab. No frame-count or capped delta.
export function createAnimationClock(){
 let origin=null,paused=null;
 return {sample(now){if(origin===null)origin=now;return Math.max(0,((paused??now)-origin)/1000);},pause(now){if(paused===null)paused=now;},resume(now){if(paused!==null){if(origin!==null)origin+=now-paused;paused=null;}},reset(){origin=null;paused=null;}};
}
