import { clamp01, scrollProgress, storyState } from './scroll-math.js';
import { createCinemaRenderer } from './cinema-renderer.js';

export function initScrollStory() {
  const section = document.querySelector('.cinema');
  if (!section) return;
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
  const pointer = {x:0,y:0};
  const targetPointer = {x:0,y:0};
  let renderer = createCinemaRenderer(canvas);
  let progress = 0;
  let active = -1;
  let visible = true;
  let paused = false;
  let previousTime = 0;
  let animationTime = 0;
  let raf = 0;
  let scrollRequested = false;
  let lastDraw = -100;
  section.classList.toggle('has-renderer',Boolean(renderer));

  function requestFrame() {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(draw);
  }
  function draw(now) {
    raf = 0;
    const animated = !paused && !preference.matches;
    const elapsed = previousTime ? Math.min(now-previousTime,80) : 0;
    previousTime = now;
    if (animated) animationTime += elapsed / 1000;
    pointer.x += (targetPointer.x-pointer.x)*.08;
    pointer.y += (targetPointer.y-pointer.y)*.08;
    if (renderer && now-lastDraw >= 32) {
      renderer.draw(animationTime,progress,preference.matches ? {x:0,y:0} : pointer);
      lastDraw = now;
    }
    if (animated && renderer) requestFrame();
  }
  function updateScroll() {
    scrollRequested = false;
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
      act.style.setProperty('--act-y',`${(1-weight)*40}px`);
      lines[index].forEach((line,lineIndex)=>{
        const amount=clamp01((weight-lineIndex*.08)/(1-lineIndex*.08));
        line.style.setProperty('--line-y',`${(1-amount)*108}%`);
        line.style.setProperty('--line-rotate',`${(1-amount)*12}deg`);
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
    lastDraw=-100;
    requestFrame();
  }
  function requestScroll() {
    if (!scrollRequested) {scrollRequested=true;requestAnimationFrame(updateScroll);}
  }
  function resize() {
    root.style.setProperty('--header-height',`${header.offsetHeight}px`);
    renderer?.resize(stage.clientWidth,stage.clientHeight);
    lastDraw=-100;
    requestScroll();
  }
  const revealTargets=[...document.querySelectorAll('.hero-copy>.eyebrow,.hero-copy>.profile-role,.presentation-title,.hero-copy>.intro,.hero-actions,.section-heading>*,.about-copy>.eyebrow,.about-copy>h2,.about-copy>p:not(.eyebrow),.about-links,.contact-heading,.contact-lead,.contact-cta,.contact-bottom')];
  const revealObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-revealed');revealObserver.unobserve(entry.target);}});
  },{threshold:.08,rootMargin:'0px 0px -25px 0px'});
  revealTargets.forEach((target,index)=>{
    target.classList.add('scroll-reveal');
    target.style.setProperty('--reveal-delay',`${Math.min(index%4,3)*70}ms`);
    revealObserver.observe(target);
  });
  function applyPreference() {
    root.classList.toggle('scroll-enhanced',!preference.matches&&!shortViewport.matches);
    pauseButton.hidden=!renderer||preference.matches;
    if(preference.matches||shortViewport.matches) revealTargets.forEach(target=>target.classList.add('is-revealed'));
    previousTime=0;
    resize();
  }
  new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;
    if(visible){previousTime=0;lastDraw=-100;requestFrame();}
    else if(raf){cancelAnimationFrame(raf);raf=0;}
  }).observe(section);
  pauseButton.addEventListener('click',()=>{
    paused=!paused;
    pauseButton.setAttribute('aria-pressed',String(paused));
    pauseButton.textContent=paused?'Reanudar animación':'Pausar animación';
    previousTime=0;
    requestFrame();
  });
  stage.addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse'||preference.matches)return;
    targetPointer.x=(event.clientX/window.innerWidth-.5)*2;
    targetPointer.y=(event.clientY/window.innerHeight-.5)*2;
  },{passive:true});
  stage.addEventListener('pointerleave',()=>{targetPointer.x=0;targetPointer.y=0;});
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();section.classList.remove('has-renderer');renderer=null;pauseButton.hidden=true;
  });
  canvas.addEventListener('webglcontextrestored',()=>{
    renderer=createCinemaRenderer(canvas);section.classList.toggle('has-renderer',Boolean(renderer));applyPreference();
  });
  document.addEventListener('visibilitychange',()=>{previousTime=0;if(!document.hidden)requestFrame();});
  window.addEventListener('scroll',requestScroll,{passive:true});
  window.addEventListener('resize',resize,{passive:true});
  new ResizeObserver(resize).observe(header);
  preference.addEventListener('change',applyPreference);
  shortViewport.addEventListener('change',applyPreference);
  applyPreference();
  updateScroll();
}
