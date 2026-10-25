import { clamp01, scrollProgress, storyState } from './scroll-math.js';
import { createCinemaRenderer } from './cinema-renderer.js';

export function initScrollStory() {
  const section = document.querySelector('.cinema');
  if (!section) return;
  const controller=new AbortController();
  const on=(target,event,handler,options={})=>target.addEventListener(event,handler,{...options,signal:controller.signal});
  let destroyed=false;
  const root = document.documentElement;
  const header = document.querySelector('.header');
  const stage = section.querySelector('.cinema-sticky');
  const canvas = section.querySelector('.cinema-canvas');
  const acts = [...section.querySelectorAll('[data-story-act]')];
  const lines = acts.map(act => [...act.querySelectorAll('.cinema-line>span')]);
  const counter = section.querySelector('.cinema-count');
  const pauseButton = section.querySelector('.cinema-pause');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const shortViewport = matchMedia('(max-height: 520px)');
  const pointer = {x:0,y:0,active:0};
  const targetPointer = {x:0,y:0,active:0};
  let renderer = createCinemaRenderer(canvas);
  let progress = 0;
  let active = -1;
  let visible = true;
  let paused = false;
  let previousTime = 0;
  let animationTime = 0;
  let raf = 0;
  let scrollRequested = false;
  let scrollRaf=0;
  section.classList.toggle('has-renderer',Boolean(renderer));
  renderer?.attachDevelopmentPanel().catch(error=>console.warn('No se pudo abrir el panel de desarrollo.',error.message));

  function requestFrame() {
    if (!destroyed && !raf && visible && !document.hidden) raf = requestAnimationFrame(draw);
  }
  function draw(now) {
    raf = 0;
    const animated = !paused && !preference.matches;
    const elapsed = previousTime ? Math.min(now-previousTime,80) : 0;
    previousTime = now;
    if (animated) animationTime += elapsed / 1000;
    pointer.x += (targetPointer.x-pointer.x)*.08;
    pointer.y += (targetPointer.y-pointer.y)*.08;
    pointer.active += (targetPointer.active-pointer.active)*.1;
    const effectPointer=preference.matches?{x:0,y:0,active:0}:{...pointer,rawX:targetPointer.x,rawY:targetPointer.y,rawActive:targetPointer.active};
    renderer?.draw(animationTime,progress,effectPointer,animated,preference.matches);
    if (animated && renderer) requestFrame();
  }
  function updateScroll() {
    scrollRequested = false;scrollRaf=0;
    const viewport = window.innerHeight;
    const total = root.scrollHeight-viewport;
    root.style.setProperty('--page-progress',`${total>0 ? clamp01(scrollY/total)*100 : 0}%`);
    const bounds = section.getBoundingClientRect();
    header.classList.toggle('cinema-header',bounds.bottom>header.offsetHeight+20);
    const enhanced = !preference.matches && !shortViewport.matches;
    const state = storyState(enhanced ? scrollProgress(bounds.top,bounds.height,viewport,0) : 0);
    progress = state.progress;
    section.style.setProperty('--cinema-progress',`${progress*100}%`);
    acts.forEach((act,index)=>{
      const weight = state.textWeights[index];
      act.style.setProperty('--act-opacity',weight.toFixed(4));
      act.style.setProperty('--act-y',`${(1-weight)*65}px`);
      act.style.setProperty('--act-blur',`${(1-weight)*7}px`);
      lines[index].forEach((line,lineIndex)=>{
        const amount=clamp01((weight-lineIndex*.08)/(1-lineIndex*.08));
        line.style.setProperty('--line-y',`${(1-amount)*126}%`);
        line.style.setProperty('--line-rotate',`${(1-amount)*18}deg`);
      });
    });
    if (active!==state.chapter) {
      active=state.chapter;
      counter.textContent=`${String(active+1).padStart(2,'0')} / 03`;
      acts.forEach((act,index)=>{
        act.setAttribute('aria-hidden',String(index!==active));
        act.querySelectorAll('a').forEach(link=>link.tabIndex=index===active ? 0 : -1);
      });
    }
    // User-driven scroll continues to choose the view when idle motion is paused.
    requestFrame();
  }
  function requestScroll() {
    if (!destroyed&&!scrollRequested) {scrollRequested=true;scrollRaf=requestAnimationFrame(updateScroll);}
  }
  function resize() {
    root.style.setProperty('--header-height',`${header.offsetHeight}px`);
    renderer?.resize(stage.clientWidth,stage.clientHeight);
    requestScroll();
  }
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
  function applyPreference() {
    root.classList.toggle('scroll-enhanced',!preference.matches&&!shortViewport.matches);
    pauseButton.hidden=!renderer||preference.matches;
    if(preference.matches||shortViewport.matches) revealTargets.forEach(target=>target.classList.add('is-revealed'));
    previousTime=0;
    resize();
  }
  const visibilityObserver=new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;
    if(visible){previousTime=0;requestFrame();}
    else if(raf){cancelAnimationFrame(raf);raf=0;}
  });
  visibilityObserver.observe(section);
  on(pauseButton,'click',()=>{
    paused=!paused;
    pauseButton.setAttribute('aria-pressed',String(paused));
    pauseButton.textContent=paused?'Reanudar animación':'Pausar animación';
    previousTime=0;
    requestFrame();
  });
  on(stage,'pointermove',event=>{
    if(event.pointerType!=='mouse'||preference.matches)return;
    const bounds=stage.getBoundingClientRect();
    targetPointer.x=Math.max(-1,Math.min(1,(event.clientX-bounds.left)/bounds.width*2-1));
    targetPointer.y=Math.max(-1,Math.min(1,(event.clientY-bounds.top)/bounds.height*2-1));
    targetPointer.active=1;
  },{passive:true});
  on(stage,'click',event=>{
    if(preference.matches||paused||event.button!==0||event.target.closest('a,button,input,label'))return;
    const bounds=stage.getBoundingClientRect();
    renderer?.explode((event.clientX-bounds.left)/bounds.width*2-1,(event.clientY-bounds.top)/bounds.height*2-1);
    requestFrame();
  });
  function clearPointer(){targetPointer.active=0;}
  on(stage,'pointerleave',clearPointer);
  on(stage,'pointercancel',clearPointer);
  on(window,'blur',clearPointer);
  on(canvas,'webglcontextlost',event=>{
    event.preventDefault();renderer?.dispose();section.classList.remove('has-renderer');renderer=null;pauseButton.hidden=true;
  });
  on(canvas,'webglcontextrestored',()=>{
    renderer=createCinemaRenderer(canvas);section.classList.toggle('has-renderer',Boolean(renderer));renderer?.attachDevelopmentPanel();applyPreference();
  });
  on(document,'visibilitychange',()=>{previousTime=0;if(!document.hidden)requestFrame();});
  on(window,'scroll',requestScroll,{passive:true});
  on(window,'resize',resize,{passive:true});
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(header);
  on(preference,'change',applyPreference);
  on(shortViewport,'change',applyPreference);
  function dispose(){
    if(destroyed)return;destroyed=true;controller.abort();
    if(raf)cancelAnimationFrame(raf);raf=0;
    if(scrollRaf)cancelAnimationFrame(scrollRaf);scrollRaf=0;
    revealObserver.disconnect();visibilityObserver.disconnect();resizeObserver.disconnect();renderer?.dispose();renderer=null;
    root.classList.remove('scroll-enhanced');section.classList.remove('has-renderer');
  }
  on(window,'pagehide',event=>{if(!event.persisted)dispose();});
  applyPreference();
  updateScroll();
  return dispose;
}
