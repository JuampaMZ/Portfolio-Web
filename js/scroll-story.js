import {createAnimationClock} from './animation-clock.js';
import {createScrollDrive} from './scroll-drive.js';
import {PARTICLE_CONFIG as config} from './particle-config.js';
import {createDeviceTilt} from './particle-orientation.js';
import {initAtmosphere} from './atmosphere.js';
import {createParticleInput} from './particle-input.js';
import {clamp01,scrollProgress,storyState} from './scroll-math.js';
import {createCinemaRenderer} from './cinema-renderer.js';
import {IS_DEVELOPMENT} from './environment.js';

export function initScrollStory(){
 const section=document.querySelector('.cinema');if(!section)return;
 const inspection=Number(new URLSearchParams(location.search).get('scene-capture'));
 const captureTime=IS_DEVELOPMENT&&['localhost','127.0.0.1','[::1]'].includes(location.hostname)&&Number.isFinite(inspection)&&inspection>=5&&inspection<=600?inspection:null;
 const captureTrail=new Float32Array(32);
 const controller=new AbortController(),on=(target,event,handler,options={})=>target.addEventListener(event,handler,{...options,signal:controller.signal});
 const root=document.documentElement,header=document.querySelector('.header'),stage=section.querySelector('.cinema-sticky'),canvas=section.querySelector('.cinema-canvas');
 if(captureTime!==null)canvas.style.transition='none';
 const copy=section.querySelector('.cinema-copy'),acts=[...section.querySelectorAll('[data-story-act]')],lines=acts.map(act=>[...act.querySelectorAll('.cinema-line>span')]),counter=section.querySelector('.cinema-count');
 const shortViewport=matchMedia('(max-height:520px)'),input=createParticleInput(),orientation=createDeviceTilt(),atmosphere=initAtmosphere(input,orientation);
 const clock=createAnimationClock(),drive=createScrollDrive(config);let ready=false,preparationId=0,lastScrollY=scrollY;
 let renderer=createCinemaRenderer(canvas),destroyed=false,raf=0,scrollRaf=0,scrollRequested=false,previousTime=0,animationTime=0,progress=0,active=-1,lastIntro=-1;
 const benchmark=IS_DEVELOPMENT&&['localhost','127.0.0.1','[::1]'].includes(location.hostname)&&new URLSearchParams(location.search).get('benchmark')==='1';let meter=null;
 if(benchmark)import('./performance-meter.js').then(({createPerformanceMeter})=>{if(!destroyed)meter=createPerformanceMeter(canvas);});
 let bounds=stage.getBoundingClientRect();
 section.classList.add('is-preparing');
 function requestFrame(){if(ready&&!destroyed&&!document.hidden&&!raf)raf=requestAnimationFrame(draw);}
 function draw(now){
  raf=0;if(destroyed||document.hidden)return;
  const dt=previousTime?Math.max(0,(now-previousTime)/1000):0;previousTime=now;
  if(!canvas.dataset.introStartedAt){canvas.dataset.introStartedAt=String(performance.now());canvas.dataset.clock='visible-wall-time';}
  animationTime=captureTime===null?clock.sample(now):captureTime;
  const motion=captureTime===null?drive.step(now,dt):null;
  const trail=captureTime===null?input.sample(stage.clientWidth,stage.clientHeight,bounds.top,bounds.left,bounds.bottom>0&&bounds.top<innerHeight):captureTrail;
  const renderStart=meter?performance.now():0;
  const intro=renderer?.draw(animationTime,progress,trail,captureTime===null?orientation.sample():[0,0],motion)||{text:1};
  meter?.frame(now,animationTime,performance.now()-renderStart);
  if(intro.text!==lastIntro){
   lastIntro=intro.text;stage.style.setProperty('--intro-opacity',intro.text.toFixed(4));stage.style.setProperty('--intro-shift',((1-intro.text)*30)+'px');stage.style.setProperty('--intro-blur',((1-intro.text)*5)+'px');
   copy.setAttribute('aria-hidden',String(intro.text<.02));stage.dataset.intro=intro.text>=1?'ready':'assembling';
   lines.forEach(group=>group.forEach((line,index)=>{const t=Math.max(0,Math.min(1,(animationTime-config.textDelay-index*config.introLineStagger)/Math.max(.1,config.textSeconds-index*config.introLineStagger))),a=t*t*(3-2*t);line.style.setProperty('--intro-line-opacity',a.toFixed(4));line.style.setProperty('--intro-line-y',((1-a)*18)+'px');line.style.setProperty('--intro-line-blur',((1-a)*5)+'px');}));
  }
  canvas.dataset.orientation=orientation.status;requestFrame();
 }
 function updateScroll(){
  scrollRaf=0;scrollRequested=false;const viewport=innerHeight,total=root.scrollHeight-viewport;
  root.style.setProperty('--page-progress',(total>0?clamp01(scrollY/total)*100:0)+'%');
  const sectionBounds=section.getBoundingClientRect();bounds=stage.getBoundingClientRect();header.classList.toggle('cinema-header',sectionBounds.bottom>header.offsetHeight+20);
  const state=storyState(shortViewport.matches?0:scrollProgress(sectionBounds.top,sectionBounds.height,viewport,0));progress=state.progress;
  section.style.setProperty('--cinema-progress',progress*100+'%');
  acts.forEach((act,index)=>{
   const weight=state.textWeights[index];act.style.setProperty('--act-opacity',weight.toFixed(4));act.style.setProperty('--act-y',(1-weight)*65+'px');act.style.setProperty('--act-blur',(1-weight)*7+'px');
   lines[index].forEach((line,lineIndex)=>{const amount=clamp01((weight-lineIndex*.08)/(1-lineIndex*.08));line.style.setProperty('--line-y',(1-amount)*126+'%');line.style.setProperty('--line-rotate',(1-amount)*18+'deg');});
  });
  if(active!==state.chapter){active=state.chapter;counter.textContent=String(active+1).padStart(2,'0')+' / 03';acts.forEach((act,index)=>{act.setAttribute('aria-hidden',String(index!==active));act.querySelectorAll('a').forEach(link=>link.tabIndex=index===active?0:-1);});}
 }
 function requestScroll(){if(!destroyed&&!scrollRequested){scrollRequested=true;scrollRaf=requestAnimationFrame(updateScroll);}}
 function resize(force=false){root.style.setProperty('--header-height',header.offsetHeight+'px');root.classList.toggle('scroll-enhanced',!shortViewport.matches);renderer?.resize(stage.clientWidth,stage.clientHeight,force);bounds=stage.getBoundingClientRect();requestScroll();}
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

 on(document,'visibilitychange',()=>{previousTime=0;if(document.hidden){clock.pause(performance.now());if(raf){cancelAnimationFrame(raf);raf=0;}}else{clock.resume(performance.now());requestFrame();}});
 on(window,'scroll',()=>{const now=performance.now(),delta=scrollY-lastScrollY;lastScrollY=scrollY;if(bounds.bottom>0&&bounds.top<innerHeight)drive.input(delta,now,innerHeight);requestScroll();},{passive:true});on(window,'resize',()=>resize(),{passive:true});on(shortViewport,'change',()=>resize());
 on(window,'particle-config-change',()=>resize(true));
 on(window,'particle-replay',()=>{clock.reset();drive.reset();delete canvas.dataset.introStartedAt;animationTime=0;previousTime=0;lastIntro=-1;renderer?.restart();});
 on(canvas,'webglcontextlost',event=>{event.preventDefault();preparationId++;ready=false;renderer?.dispose();renderer=null;section.classList.remove('has-renderer');});
 on(canvas,'webglcontextrestored',()=>{renderer=createCinemaRenderer(canvas);resize();prepare();});
 const resizeObserver=new ResizeObserver(()=>resize());resizeObserver.observe(header);
 function dispose(){
  if(destroyed)return;destroyed=true;controller.abort();if(raf)cancelAnimationFrame(raf);if(scrollRaf)cancelAnimationFrame(scrollRaf);
  revealObserver.disconnect();resizeObserver.disconnect();meter?.dispose();renderer?.dispose();atmosphere.dispose();input.dispose();orientation.dispose();root.classList.remove('scroll-enhanced');section.classList.remove('has-renderer');
 }
 on(window,'pagehide',event=>{if(!event.persisted)dispose();});resize();updateScroll();
 // Fixed inspection frames exist only on the local development server.
 if(captureTime!==null){renderer?.draw(0,progress,captureTrail,[0,0]);renderer?.resize(stage.clientWidth,stage.clientHeight,true);canvas.dataset.captureTime=String(captureTime);}
 async function prepare(){
  const id=++preparationId;
  ready=false;section.classList.add('is-preparing');section.classList.remove('has-renderer');
  try{
   // Font layout, optional GUI, both GPU buffer slots and every postprocess shader precede time zero.
   await document.fonts.ready;if(destroyed||id!==preparationId)return;resize();
   // Rasterize the loaded glyphs before their first visible fade, without a visible flash.
   copy.style.opacity='.001';copy.style.filter='none';await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
   copy.style.removeProperty('opacity');copy.style.removeProperty('filter');if(destroyed||id!==preparationId)return;
   if(captureTime===null&&!benchmark&&!location.pathname.includes('intro-profile'))await renderer?.attachDevelopmentPanel();
   await renderer?.prepare();if(destroyed||id!==preparationId)return;
   clock.reset();drive.reset();animationTime=0;previousTime=0;delete canvas.dataset.introStartedAt;
   if(captureTime!==null){renderer?.draw(0,progress,captureTrail,[0,0]);renderer?.resize(stage.clientWidth,stage.clientHeight,true);}
   section.classList.remove('is-preparing');section.classList.toggle('has-renderer',Boolean(renderer));ready=true;requestFrame();
  }catch(error){if(destroyed||id!==preparationId)return;section.classList.remove('is-preparing');console.error('No se pudo preparar la escena.',error);renderer?.dispose();renderer=null;ready=true;requestFrame();}
 }
 prepare();return dispose;
}
