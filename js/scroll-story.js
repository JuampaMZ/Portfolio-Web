import {createAnimationClock} from './animation-clock.js';
import {createScrollDrive} from './scroll-drive.js';
import {PARTICLE_CONFIG as config} from './particle-config.js';
import {bigBangState,createBangProgress,clamp01,smooth} from './big-bang.js';
import {initAtmosphere} from './atmosphere.js';
import {createParticleInput} from './particle-input.js';
import {scrollProgress} from './scroll-math.js';
import {createCinemaRenderer} from './cinema-renderer.js';
import {createMeshCore} from './core-mesh-renderer.js';
import {IS_DEVELOPMENT} from './environment.js';

export function initScrollStory(){
 const section=document.querySelector('.cinema');if(!section)return;
 const query=new URLSearchParams(location.search),local=IS_DEVELOPMENT&&['localhost','127.0.0.1','[::1]'].includes(location.hostname);
 if(['A','B'].includes(query.get('beam')))config.beamVariant=query.get('beam');
 const captureTime=local&&(query.has('scene-capture')||query.has('bang-capture'))?Math.max(5,Number(query.get('scene-capture'))||50):null;
 const captureBang=local&&query.has('bang-capture')?clamp01(Number(query.get('bang-capture'))):captureTime!==null?1:null;
 const root=document.documentElement,header=document.querySelector('.header'),stage=section.querySelector('.cinema-sticky'),canvas=section.querySelector('.cinema-canvas'),fallback=section.querySelector('canvas.cinema-fallback'),copy=section.querySelector('.cinema-copy');
 const acts=[...section.querySelectorAll('[data-story-act]')],lines=[...acts[0].querySelectorAll('.cinema-line>span')],counter=section.querySelector('.cinema-count'),progressBar=section.querySelector('.cinema-progress i');
 const controller=new AbortController(),on=(target,event,handler,options={})=>target?.addEventListener(event,handler,{...options,signal:controller.signal});
 const input=createParticleInput(),atmosphere=initAtmosphere(input),clock=createAnimationClock(),drive=createScrollDrive(config),bangProgress=createBangProgress(config),empty=new Float32Array(32);
 let renderer,ready=false,destroyed=false,raf=0,scrollRaf=0,scrollRequested=false,previous=0,orbitTime=0,bangTarget=0,rawProgress=0,epoch=0,recoveries=0,lastScrollY=scrollY,resizeTimer=0;
 let stableHeight=Math.max(240,Math.round(window.visualViewport?.height||innerHeight)),stableWidth=document.documentElement.clientWidth;
 let lastRender=null,lastCopy=-1,lastBackground=-1,lastBeam=-1,lastPercent=-1;let bounds=stage.getBoundingClientRect();const quality={forceLow:local&&query.get('quality')==='low',forceLdr:local&&query.get('quality')==='ldr'};
 acts.forEach((act,index)=>{act.style.setProperty('--act-opacity',index===0?'1':'0');act.style.setProperty('--act-y','0px');act.style.setProperty('--act-blur','0px');act.setAttribute('aria-hidden',String(index!==0));act.querySelectorAll('a').forEach(a=>a.tabIndex=index===0?0:-1);});
 const benchmark=local&&query.get('benchmark')==='1';let meter=null;if(benchmark)import('./performance-meter.js').then(({createPerformanceMeter})=>{if(!destroyed)meter=createPerformanceMeter(canvas);});
 renderer=createCinemaRenderer(canvas,{fallbackCanvas:fallback,forceFallback:local&&query.get('safe')==='1',quality});
 function classes(){clearTimeout(window.craftCoreWatchdog);section.classList.toggle('has-renderer',renderer?.engine==='webgl2');section.classList.toggle('has-safe-renderer',renderer?.engine==='canvas-safe');section.classList.toggle('has-static-renderer',!renderer);}
 function requestFrame(){if(ready&&!destroyed&&!document.hidden&&!raf)raf=requestAnimationFrame(draw);}
 function draw(now){
  raf=0;if(destroyed||document.hidden)return;const dt=previous?Math.max(0,(now-previous)/1000):0;previous=now;
  if(!canvas.dataset.introStartedAt){canvas.dataset.introStartedAt=String(performance.now());canvas.dataset.clock='scroll-progress';}
  const time=captureTime??clock.sample(now),p=captureBang??bangProgress.step(bangTarget,dt),bang=bigBangState(p,config),motion=captureTime!==null?{phase:time,rate:1,energy:0,extraAngle:0}:drive.step(now,dt);
  orbitTime+=dt*smooth(config.bangAbsorptionEnd,1,p);Object.assign(motion,{bigBang:p,orbitTime:captureTime!==null?(p>=.9?time:0):orbitTime});
  const trail=captureTime!==null?empty:input.sample(stage.clientWidth,stage.clientHeight,bounds.top,bounds.left,bounds.bottom>0&&bounds.top<innerHeight);
  const begin=meter?performance.now():0;
  lastRender={time,trail,motion};renderer?.draw(time,rawProgress,trail,[0,0],motion);meter?.frame(now,time,performance.now()-begin);
  if(renderer?.canvas!==canvas&&renderer?.canvas)Object.assign(canvas.dataset,renderer.canvas.dataset);
  Object.assign(canvas.dataset,{bangProgress:p.toFixed(5),bangPhase:bang.phase,contextRecoveries:String(recoveries)});
  // Do not invalidate every inherited style in the document while its value is unchanged.
  if(lastBackground!==bang.background){atmosphere.setReveal(bang.background.toFixed(4));lastBackground=bang.background;}
  if(lastBeam!==bang.beam){stage.style.setProperty('--fallback-formed',bang.beam.toFixed(4));lastBeam=bang.beam;}
  if(lastCopy!==bang.text){
   stage.style.setProperty('--intro-opacity',bang.text.toFixed(4));stage.style.setProperty('--intro-shift',((1-bang.text)*18)+'px');stage.style.setProperty('--intro-blur',((1-bang.text)*3)+'px');copy.setAttribute('aria-hidden',String(bang.text<.02));
   lines.forEach((line,index)=>{const amount=smooth(config.bangAbsorptionEnd+index*.012,1,p);line.style.setProperty('--line-y','0%');line.style.setProperty('--line-rotate','0deg');line.style.setProperty('--intro-line-opacity',amount.toFixed(4));line.style.setProperty('--intro-line-y',((1-amount)*18)+'px');line.style.setProperty('--intro-line-blur',((1-amount)*4)+'px');});lastCopy=bang.text;
  }
  stage.dataset.intro='ready';stage.dataset.bangPhase=bang.phase;const percent=Math.round(p*100);if(percent!==lastPercent){counter.textContent=percent+'%';lastPercent=percent;}requestFrame();
 }
 function updateScroll(){scrollRaf=0;scrollRequested=false;const r=section.getBoundingClientRect();bounds=stage.getBoundingClientRect();rawProgress=scrollProgress(r.top,r.height,stage.clientHeight,0);bangTarget=clamp01(rawProgress/config.bangFormationScroll);header.classList.toggle('cinema-header',r.bottom>header.offsetHeight+20);const total=root.scrollHeight-innerHeight;header.style.setProperty('--page-progress',(total>0?clamp01(scrollY/total)*100:0)+'%');progressBar.style.width=(bangTarget*100)+'%';}
 function requestScroll(){if(!destroyed&&!scrollRequested){scrollRequested=true;scrollRaf=requestAnimationFrame(updateScroll);}}
 function resize(force=false){section.dataset.formationScroll=String(config.bangFormationScroll);root.style.setProperty('--header-height',header.offsetHeight+'px');root.style.setProperty('--stage-height',stableHeight+'px');section.style.height=Math.round(stableHeight*config.bangHeightVh/100)+'px';root.classList.add('scroll-enhanced');renderer?.resize(Math.max(1,stage.clientWidth),Math.max(1,stage.clientHeight),force);bounds=stage.getBoundingClientRect();requestScroll();}
 function scheduleResize(){clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(destroyed)return;const w=document.documentElement.clientWidth,h=Math.max(240,Math.round(window.visualViewport?.height||innerHeight));if(Math.abs(w-stableWidth)>2||Math.abs(h-stableHeight)>96||w>700){stableWidth=w;stableHeight=h;resize();}else requestScroll();},180);}
 function useFallback(reason){const old=renderer;renderer=createCinemaRenderer(canvas,{fallbackCanvas:fallback,forceFallback:true});old?.dispose();canvas.dataset.fallbackReason=reason;resize();if(lastRender)renderer?.seek(lastRender.time,rawProgress,lastRender.trail,[0,0],lastRender.motion);classes();section.classList.remove('is-preparing');ready=true;requestFrame();}
 async function prepare(candidate=renderer,restoring=false){const id=++epoch;
  if(!restoring){ready=false;section.classList.add('is-preparing');}
  try{
   await document.fonts.ready;if(destroyed||id!==epoch)return;resize();
   copy.style.opacity='.001';copy.style.filter='none';await new Promise(requestAnimationFrame);copy.style.removeProperty('opacity');copy.style.removeProperty('filter');
   if(local&&captureTime===null&&!benchmark&&!location.pathname.includes('profile')&&query.get('panel')!=='0')await candidate?.attachDevelopmentPanel();
   if(restoring)candidate.resize(stage.clientWidth,stage.clientHeight);await candidate?.prepare();if(destroyed||id!==epoch){if(candidate!==renderer)candidate?.dispose();return;}
   if(restoring){if(lastRender)candidate.seek(lastRender.time,rawProgress,lastRender.trail,[0,0],lastRender.motion);renderer?.dispose();renderer=candidate;candidate.publishProfile();canvas.style.transition='none';}
   if(captureTime!==null){candidate?.seek(captureTime,0,empty,[0,0],{phase:captureTime,rate:1,extraAngle:0,bigBang:captureBang,orbitTime:captureBang>=.9?captureTime:0});canvas.style.transition='none';}
   classes();section.classList.remove('is-preparing');ready=true;previous=0;requestFrame();
  }catch(error){if(destroyed||id!==epoch)return;if(candidate!==renderer)candidate?.dispose();useFallback(error.message);}
 }
 on(document,'visibilitychange',()=>{previous=0;if(document.hidden){clock.pause(performance.now());if(raf){cancelAnimationFrame(raf);raf=0;}}else{clock.resume(performance.now());requestFrame();}});
 on(window,'scroll',()=>{const delta=scrollY-lastScrollY;lastScrollY=scrollY;if(bangTarget>=.995&&bounds.bottom>0&&bounds.top<innerHeight)drive.input(delta,performance.now(),innerHeight);requestScroll();},{passive:true});on(window,'resize',scheduleResize,{passive:true});on(window.visualViewport,'resize',scheduleResize,{passive:true});
 on(window,'particle-config-change',()=>{resize(true);});
 on(canvas,'webglcontextlost',event=>{if(destroyed||renderer?.engine!=='webgl2')return;event.preventDefault();epoch++;recoveries++;useFallback('context-lost');});
 on(canvas,'webglcontextrestored',()=>{if(destroyed)return;const candidate=createMeshCore(canvas,{quality:{...quality,forceLow:recoveries>0}});if(candidate)prepare(candidate,true);});
 if(local)on(window,'cosmic-test-context-loss',()=>{const ext=canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context');if(ext){ext.loseContext();setTimeout(()=>ext.restoreContext(),700);}});
  document.querySelectorAll('.section-heading h2,.about-copy>h2,.contact-heading h2').forEach(heading=>{
    if(heading.dataset.revealPrepared)return;
    heading.dataset.revealPrepared='true';
    heading.setAttribute('aria-label',heading.innerText.replace(/\s+/g,' ').trim());
    heading.innerHTML=heading.innerHTML.split(/<br\s*\/?\s*>/i).map((line,index)=>`<span class="reveal-line"><span style="--line-delay:${index*140}ms">${line}</span></span>`).join('');
  });
  const revealTargets=[...document.querySelectorAll('.section-heading>*,.filters,.project-browser,.github-link,.about-copy>.eyebrow,.about-copy>h2,.about-copy>p:not(.eyebrow),.about-links,.contact-heading,.contact-lead,.contact-cta,.contact-bottom')];
  const revealObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-revealed');revealObserver.unobserve(entry.target);}});
  },{threshold:.05,rootMargin:'0px 0px -20px 0px'});
  revealTargets.forEach((target,index)=>{
    target.classList.add('scroll-reveal');
    target.style.setProperty('--reveal-delay',`${Math.min(index%4,3)*100}ms`);
    revealObserver.observe(target);
  });


 const resizeObserver=new ResizeObserver(()=>resize());resizeObserver.observe(header);
 function dispose(){if(destroyed)return;destroyed=true;epoch++;controller.abort();clearTimeout(resizeTimer);clearTimeout(window.craftCoreWatchdog);if(raf)cancelAnimationFrame(raf);if(scrollRaf)cancelAnimationFrame(scrollRaf);revealObserver.disconnect();resizeObserver.disconnect();meter?.dispose();renderer?.dispose();atmosphere.dispose();input.dispose();root.classList.remove('scroll-enhanced');}
 on(window,'pagehide',event=>{if(!event.persisted)dispose();});resize();updateScroll();prepare();return dispose;
}
