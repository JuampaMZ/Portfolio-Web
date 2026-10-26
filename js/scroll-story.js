import {initAtmosphere} from './atmosphere.js';
import {createParticleInput} from './particle-input.js';
import {clamp01,scrollProgress,storyState} from './scroll-math.js';
import {createCinemaRenderer} from './cinema-renderer.js';

export function initScrollStory(){
 const section=document.querySelector('.cinema');if(!section)return;
 const controller=new AbortController(),on=(target,event,handler,options={})=>target.addEventListener(event,handler,{...options,signal:controller.signal});
 const root=document.documentElement,header=document.querySelector('.header'),stage=section.querySelector('.cinema-sticky'),canvas=section.querySelector('.cinema-canvas');
 const copy=section.querySelector('.cinema-copy'),acts=[...section.querySelectorAll('[data-story-act]')],lines=acts.map(act=>[...act.querySelectorAll('.cinema-line>span')]),counter=section.querySelector('.cinema-count');
 const shortViewport=matchMedia('(max-height:520px)'),input=createParticleInput(),atmosphere=initAtmosphere(input);
 let renderer=createCinemaRenderer(canvas),destroyed=false,raf=0,scrollRaf=0,scrollRequested=false,previousTime=0,animationTime=0,progress=0,active=-1,lastIntro=-1;
 let bounds=stage.getBoundingClientRect();
 section.classList.toggle('has-renderer',Boolean(renderer));
 renderer?.attachDevelopmentPanel().catch(error=>console.warn('No se pudo abrir el panel local.',error.message));
 function requestFrame(){if(!destroyed&&!document.hidden&&!raf)raf=requestAnimationFrame(draw);}
 function draw(now){
  raf=0;if(destroyed||document.hidden)return;
  animationTime+=previousTime?Math.min(now-previousTime,50)/1000:0;previousTime=now;
  const trail=input.sample(stage.clientWidth,stage.clientHeight,bounds.top,bounds.left,bounds.bottom>0&&bounds.top<innerHeight);
  const intro=renderer?.draw(animationTime,progress,trail)||{text:1};
  if(intro.text!==lastIntro){
   lastIntro=intro.text;stage.style.setProperty('--intro-opacity',intro.text.toFixed(4));stage.style.setProperty('--intro-shift',((1-intro.text)*30)+'px');stage.style.setProperty('--intro-blur',((1-intro.text)*5)+'px');
   copy.setAttribute('aria-hidden',String(intro.text<.02));stage.dataset.intro=intro.text>=1?'ready':'assembling';
  }
  requestFrame();
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

 on(document,'visibilitychange',()=>{previousTime=0;if(document.hidden&&raf){cancelAnimationFrame(raf);raf=0;}else requestFrame();});
 on(window,'scroll',requestScroll,{passive:true});on(window,'resize',()=>resize(),{passive:true});on(shortViewport,'change',()=>resize());
 on(window,'particle-config-change',()=>resize(true));
 on(window,'particle-replay',()=>{animationTime=0;previousTime=0;lastIntro=-1;renderer?.restart();});
 on(canvas,'webglcontextlost',event=>{event.preventDefault();renderer?.dispose();renderer=null;section.classList.remove('has-renderer');});
 on(canvas,'webglcontextrestored',()=>{renderer=createCinemaRenderer(canvas);section.classList.toggle('has-renderer',Boolean(renderer));renderer?.attachDevelopmentPanel();resize();});
 const resizeObserver=new ResizeObserver(()=>resize());resizeObserver.observe(header);
 function dispose(){
  if(destroyed)return;destroyed=true;controller.abort();if(raf)cancelAnimationFrame(raf);if(scrollRaf)cancelAnimationFrame(scrollRaf);
  revealObserver.disconnect();resizeObserver.disconnect();renderer?.dispose();atmosphere.dispose();input.dispose();root.classList.remove('scroll-enhanced');section.classList.remove('has-renderer');
 }
 on(window,'pagehide',event=>{if(!event.persisted)dispose();});resize();updateScroll();requestFrame();return dispose;
}
