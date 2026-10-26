// Performance Timeline measurements belong only to this local harness.
const cosmicTasks=[],cosmicFrames=[],cosmicObservers=[];let cosmicStart=Infinity,cosmicEnd=-Infinity;
for(const [type,list]of [['longtask',cosmicTasks],['long-animation-frame',cosmicFrames]])if(PerformanceObserver.supportedEntryTypes.includes(type)){const o=new PerformanceObserver(entries=>list.push(...entries.getEntries().map(e=>({start:e.startTime,duration:e.duration,blocking:e.blockingDuration||0,scripts:(e.scripts||[]).map(s=>({url:s.sourceURL,name:s.sourceFunctionName,duration:s.duration}))}))));o.observe({type,buffered:true});cosmicObservers.push(o);}
window.addEventListener('DOMContentLoaded',()=>{
 const tools=document.createElement('aside');tools.style='position:fixed;z-index:30000;top:95px;left:12px;max-width:420px;background:#07111ae8;padding:12px;color:#e8efe9;font:12px system-ui';
 tools.innerHTML='<button id="cosmic-run" disabled>Perfilar Big Bang y regreso</button> <button id="cosmic-loss">Simular pérdida de contexto</button><pre id="cosmic-report" style="max-height:45vh;overflow:auto;white-space:pre-wrap">Preparando GPU…</pre>';document.body.append(tools);
 const button=tools.querySelector('#cosmic-run'),report=tools.querySelector('pre'),canvas=document.querySelector('.cinema-canvas');
 const check=()=>{if(canvas.dataset.gpuReady==='ready'){button.disabled=false;report.textContent='Listo para medir.';}else requestAnimationFrame(check);};requestAnimationFrame(check);
 tools.querySelector('#cosmic-loss').onclick=()=>window.dispatchEvent(new Event('cosmic-test-context-loss'));
 button.onclick=()=>{const oldScrollBehavior=document.documentElement.style.scrollBehavior;document.documentElement.style.scrollBehavior='auto';button.disabled=true;cosmicTasks.length=0;cosmicFrames.length=0;cosmicStart=performance.now();const stage=document.querySelector('.cinema-sticky'),section=document.querySelector('.cinema'),base=section.getBoundingClientRect().top+scrollY,max=(section.offsetHeight-stage.clientHeight)*Number(section.dataset.formationScroll);const samples=[],steps=[];let previous=cosmicStart,lastPhase='';
  report.textContent='Midiendo avance, núcleo completo y regreso…';
  const run=now=>{const t=(now-cosmicStart)/1000;let p=t<3.6?t/3.6:t<5.2?1:t<8.8?1-(t-5.2)/3.6:0;window.scrollTo(0,Math.max(0,base+max*p));samples.push(now-previous);previous=now;
   const phase=canvas.dataset.bangPhase;if(phase!==lastPhase){steps.push({t,phase,progress:canvas.dataset.bangProgress,engine:canvas.dataset.particleEngine});lastPhase=phase;}
   if(t<10.4){requestAnimationFrame(run);return;}cosmicEnd=now;setTimeout(()=>{const tasks=cosmicTasks.filter(t=>t.start<cosmicEnd&&t.start+t.duration>cosmicStart),frames=cosmicFrames.filter(t=>t.start<cosmicEnd&&t.start+t.duration>cosmicStart),mean=samples.reduce((s,v)=>s+v,0)/samples.length;
    const result={viewport:[innerWidth,innerHeight],quality:canvas.dataset.quality,hdr:canvas.dataset.hdr,variant:canvas.dataset.beamVariant,particles:canvas.dataset.particleCount,durationMs:cosmicEnd-cosmicStart,longTasks:tasks,longFrames:frames,meanFrameMs:mean,phases:steps,finalProgress:canvas.dataset.bangProgress};report.dataset.status=tasks.length?'long-tasks':'passed';report.dataset.result=JSON.stringify(result);report.textContent=JSON.stringify(result,null,2);button.disabled=false;document.documentElement.style.scrollBehavior=oldScrollBehavior;
   },100);
  };requestAnimationFrame(run);
 };
});

window.addEventListener('pagehide',()=>cosmicObservers.forEach(o=>o.disconnect()),{once:true});

