// Browser Performance Timeline: Long Tasks + Long Animation Frames, before any app module.
const tasks=[],frames=[],observers=[],started=performance.now();let first=null,finished=false;
for(const [type,list]of [['longtask',tasks],['long-animation-frame',frames]]){
 if(!PerformanceObserver.supportedEntryTypes.includes(type))continue;
 const observer=new PerformanceObserver(entries=>list.push(...entries.getEntries().map(e=>({start:e.startTime,duration:e.duration,blocking:e.blockingDuration||0,scripts:(e.scripts||[]).map(s=>({name:s.sourceFunctionName,url:s.sourceURL,duration:s.duration}))}))));observer.observe({type,buffered:true});observers.push(observer);
}
const probe=()=>{
 const canvas=document.querySelector('.cinema-canvas'),age=Number(canvas?.dataset.animationTime||0),ready=Number(canvas?.dataset.introStartedAt);
 if(canvas?.dataset.gpuReady==='preparing'){requestAnimationFrame(probe);return;}
 if(first===null&&age>0)first=Number.isFinite(ready)&&ready>0?ready:performance.now()-age*1000;
 if(first!==null&&age>=5.8&&!finished){
  finished=true;const end=first+5500,during=tasks.filter(t=>t.start<end&&t.start+t.duration>first),prep=tasks.filter(t=>t.start+t.duration<=first);
  const result={supported:PerformanceObserver.supportedEntryTypes,preparationMs:Math.round(first-started),introLongTasks:during,preparationLongTasks:prep,longFrames:frames.filter(t=>t.start<end&&t.start+t.duration>first),durationMs:5500,coreReady:canvas?.dataset.gpuReady||'unprepared',clock:canvas?.dataset.clock||'capped-delta'};
  const output=document.createElement('pre');output.id='intro-profile';output.dataset.result=JSON.stringify(result);output.dataset.status=during.length?'long-tasks':'passed';output.textContent=JSON.stringify(result,null,2);output.style='position:fixed;left:10px;bottom:10px;z-index:20000;max-width:600px;max-height:45vh;overflow:auto;background:#03101aee;color:#d8eddf;padding:12px;font:11px monospace';document.body.append(output);observers.forEach(o=>o.disconnect());
 }else requestAnimationFrame(probe);
};requestAnimationFrame(probe);
