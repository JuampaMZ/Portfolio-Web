// Development-only RAF measurements. Loaded only by ?benchmark=1 on localhost.
export function createPerformanceMeter(canvas){
 const output=document.createElement('output');output.id='performance-result';output.textContent='Midiendo: espera de entrada + 8 segundos de animación…';
 Object.assign(output.style,{position:'fixed',bottom:'8px',left:'8px',zIndex:10000,maxWidth:'95vw',padding:'10px',background:'#03080eee',color:'#e8f3ee',font:'12px monospace',whiteSpace:'pre-wrap',pointerEvents:'none'});document.body.append(output);
 const frames=[],commands=[];let previous=0,start=0,finished=false;
 const visibility=()=>{if(document.hidden&&!finished){previous=0;start=0;frames.length=0;commands.length=0;}};document.addEventListener('visibilitychange',visibility);
 const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.floor(values.length*p))];
 const round=n=>Math.round(n*100)/100;
 return {
  frame(now,age,renderMs){
   if(finished)return;if(document.hidden){previous=0;start=0;frames.length=0;commands.length=0;return;}
   if(age<6){previous=now;return;}if(!start){start=now;previous=now;return;}
   frames.push(now-previous);commands.push(renderMs);previous=now;if(now-start<8000)return;
   finished=true;const mean=frames.reduce((a,b)=>a+b,0)/frames.length;
   const result={viewport:[innerWidth,innerHeight],dpr:Number(canvas.dataset.pixelRatio),particles:Number(canvas.dataset.particleCount),samples:frames.length,durationMs:round(now-start),meanMs:round(mean),medianMs:round(percentile(frames,.5)),p95Ms:round(percentile(frames,.95)),fps:round(1000/mean),framesOver25ms:frames.filter(t=>t>25).length,meanCommandMs:round(commands.reduce((a,b)=>a+b,0)/commands.length),cores:navigator.hardwareConcurrency,memoryGB:navigator.deviceMemory||null};
   output.textContent=JSON.stringify(result,null,2);output.dataset.status='complete';output.dataset.result=JSON.stringify(result);
  },dispose(){document.removeEventListener('visibilitychange',visibility);output.remove();}
 };
}
