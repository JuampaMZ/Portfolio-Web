import { clamp01, scrollProgress, storyState } from './scroll-math.js';

export function initScrollStory() {
  const section = document.querySelector('.scroll-story');
  if (!section) return;
  const root = document.documentElement;
  const header = document.querySelector('.header');
  const acts = [...section.querySelectorAll('[data-story-act]')];
  const layers = [...section.querySelectorAll('[data-story-layer]')];
  const chapters = [...section.querySelectorAll('[data-story-chapter]')];
  const lines = acts.map(act => [...act.querySelectorAll('.story-line>span')]);
  const counter = section.querySelector('.story-counter');
  const progress = section.querySelector('.story-progress');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const shortViewport = matchMedia('(max-height: 520px)');
  let requested = false;
  let previous = -1;
  let active = -1;

  function render() {
    requested = false;
    const viewport = window.innerHeight;
    const headerHeight = header.offsetHeight;
    root.style.setProperty('--header-height', `${headerHeight}px`);
    const total = root.scrollHeight - viewport;
    root.style.setProperty('--page-progress', `${total > 0 ? scrollY / total * 100 : 0}%`);
    if (preference.matches || shortViewport.matches) return;
    const bounds = section.getBoundingClientRect();
    const state = storyState(scrollProgress(bounds.top, bounds.height, viewport, headerHeight));
    if (Math.abs(state.progress - previous) < .0005) return;
    previous = state.progress;
    section.style.setProperty('--story-progress', state.progress.toFixed(4));
    section.style.setProperty('--core-x', `${-18 + state.progress * 72}deg`);
    section.style.setProperty('--core-y', `${28 + state.progress * 230}deg`);
    section.style.setProperty('--orbit-turn', `${state.progress * 125}deg`);
    section.style.setProperty('--camera-y', `${(state.progress - .5) * 10}deg`);
    section.style.setProperty('--camera-x', `${(state.progress - .5) * -5}deg`);
    section.style.setProperty('--core-opacity', state.weights[0].toFixed(4));
    acts.forEach((act, index) => {
      const weight = state.weights[index];
      // Text leaves before the next chapter enters, preventing overlapping copy.
      const textWeight = state.textWeights[index];
      act.style.setProperty('--act-opacity', textWeight.toFixed(4));
      act.style.setProperty('--act-y', `${(1 - textWeight) * 25}px`);
      lines[index].forEach((line, lineIndex) => {
        const amount = clamp01((textWeight - lineIndex * .1) / (1 - lineIndex * .1));
        line.style.setProperty('--line-y', `${(1 - amount) * 110}%`);
        line.style.setProperty('--line-rotate', `${(1 - amount) * 18}deg`);
      });
      layers[index].style.setProperty('--layer-opacity', weight.toFixed(4));
      layers[index].style.setProperty('--layer-scale', `${.8 + weight * .2}`);
      layers[index].style.setProperty('--layer-y', `${(1 - weight) * 80}px`);
      layers[index].style.setProperty('--layer-rotate', `${(1 - weight) * -13}deg`);
    });
    if (active !== state.chapter) {
      active = state.chapter;
      counter.textContent = `${String(active + 1).padStart(2,'0')} / 03`;
      acts.forEach((act, index) => act.setAttribute('aria-hidden', String(index !== active)));
      chapters.forEach((chapter, index) => chapter.classList.toggle('is-current', index === active));
    }
    progress.value = state.progress;
  }
  function requestRender() {
    if (requested) return;
    requested = true;
    requestAnimationFrame(render);
  }
  const revealTargets = [...document.querySelectorAll('.hero-copy>.eyebrow,.hero-copy>.profile-role,.hero-copy>h1,.hero-copy>.intro,.hero-actions,.section-heading>*,'+
    '.about-copy>.eyebrow,.about-copy>h2,.about-copy>p:not(.eyebrow),.about-links,.contact-heading,.contact-lead,.contact-cta,.contact-bottom')];
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); observer.unobserve(entry.target); }
    });
  }, { threshold: .08, rootMargin: '0px 0px -25px 0px' });
  revealTargets.forEach((target, index) => {
    target.classList.add('scroll-reveal');
    target.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 65}ms`);
    observer.observe(target);
  });
  function applyPreference() {
    root.classList.toggle('scroll-enhanced', !preference.matches && !shortViewport.matches);
    if (preference.matches || shortViewport.matches) {
      acts.forEach(act => act.removeAttribute('aria-hidden'));
      revealTargets.forEach(target => target.classList.add('is-revealed'));
    }
    previous = -1;
    active = -1;
    requestRender();
  }
  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', () => { previous = -1; requestRender(); }, { passive: true });
  new ResizeObserver(() => { previous = -1; requestRender(); }).observe(header);
  preference.addEventListener('change', applyPreference);
  shortViewport.addEventListener('change', applyPreference);
  applyPreference();
  render();
}
