import { pointerRotationSpeed, prismLayout, viewportPointerPosition } from './motion.js';
import { initScrollStory } from './scroll-story.js';

const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() {
  navigation.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Abrir navegación');
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  navigation.classList.toggle('is-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Cerrar navegación' : 'Abrir navegación');
});
navigation.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') { closeMenu(); menuButton.focus(); }
});
document.addEventListener('click', event => { if (!event.target.closest('.header')) closeMenu(); });

const filters = [...document.querySelectorAll('[data-filter]')];
const projects = [...document.querySelectorAll('[data-category]')];
const browser = document.querySelector('.project-browser');
const rotor = document.querySelector('.projects');
const playback = document.querySelector('.rotation-toggle');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let visible = [...projects];
let faces = [...projects];
let selected = 0;
let activeFace = -1;
let angle = 0;
let userPaused = motionPreference.matches;
let pointerPosition = null;
let mouseCoordinates = null;
let keyboardMode = false;
let velocity = 4;
let touching = false;
let onScreen = false;
let manualUntil = 0;
let turnAnimation = null;
let previousFrame = 0;
let contactTimer;
const ticker = document.querySelector('.ticker');
const tickerTrack = document.querySelector('.ticker-track');
const tickerGroup = document.querySelector('.ticker-group');
let tickerWidth = 1;
let tickerOffset = 0;
let tickerPointer = null;
let tickerVisible = false;
let tickerVelocity = 36;

function animateTicker(elapsed) {
  if (motionPreference.matches || document.hidden || !tickerVisible) return;
  const desired = tickerPointer === null ? 36 : Math.abs(tickerPointer) < .12 ? 0 : tickerPointer * 120;
  tickerVelocity += (desired - tickerVelocity) * (1 - Math.exp(-elapsed / 240));
  tickerOffset = ((tickerOffset + elapsed * tickerVelocity / 1000) % tickerWidth + tickerWidth) % tickerWidth;
  tickerTrack.style.transform = `translate3d(${-tickerOffset}px,0,0)`;
}
ticker.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse') return;
  const bounds = ticker.getBoundingClientRect();
  tickerPointer = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
});
ticker.addEventListener('pointerleave', () => { tickerPointer = null; });
new ResizeObserver(() => { tickerWidth = tickerGroup.offsetWidth || 1; }).observe(tickerGroup);
new IntersectionObserver(entries => { tickerVisible = entries[0].isIntersecting; }).observe(ticker);

function stepAngle() { return 360 / faces.length; }
function rebuildFaces() {
  rotor.querySelectorAll('.prism-copy').forEach(copy => copy.remove());
  faces = [...visible];
  const { faceCount } = prismLayout(visible.length, rotor.offsetWidth);
  for (let index = visible.length; index < faceCount; index++) {
    const copy = visible[index % visible.length].cloneNode(true);
    copy.removeAttribute('id');
    copy.classList.add('prism-copy');
    copy.hidden = false;
    rotor.append(copy);
    faces.push(copy);
  }
  activeFace = -1;
}
function updateGeometry() {
  const { radius } = prismLayout(visible.length, rotor.offsetWidth);
  rotor.style.setProperty('--radius', `${radius}px`);
  faces.forEach((project, index) => project.style.setProperty('--face-angle', `${index * stepAngle()}deg`));
}
function updateSelection(announce = false) {
  const step = stepAngle();
  activeFace = ((Math.round(angle / step) % faces.length) + faces.length) % faces.length;
  selected = activeFace % visible.length;
  rotor.querySelectorAll('.project').forEach(project => {
    const active = project === faces[activeFace];
    project.inert = !active;
    project.setAttribute('aria-hidden', String(!active));
    project.classList.toggle('is-active', active);
    project.classList.remove('is-before', 'is-after');
  });
  const label = `${String(selected + 1).padStart(2,'0')} / ${String(visible.length).padStart(2,'0')} · ${visible[selected].querySelector('h3').textContent}`;
  document.querySelector('#card-position').textContent = label;
  if (announce) document.querySelector('#prism-status').textContent = label;
}
function paintRotation() {
  rotor.style.setProperty('--turn', `${-angle}deg`);
  const next = ((Math.round(angle / stepAngle()) % faces.length) + faces.length) % faces.length;
  if (activeFace !== next) updateSelection();
}
function updatePlayback() {
  playback.setAttribute('aria-pressed', String(userPaused));
  const playIcon = '<svg class="playback-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="m5 3 8 5-8 5Z" fill="currentColor"/></svg>';
  const pauseIcon = '<svg class="playback-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M5 3v10M11 3v10" stroke="currentColor" stroke-width="2"/></svg>';
  playback.innerHTML = userPaused ? `Activar rotación ${playIcon}` : `Detener rotación ${pauseIcon}`;
  playback.disabled = visible.length < 2;
}
function filterProjects(category) {
  filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
  visible = projects.filter(project => category === 'all' || project.dataset.category === category);
  projects.forEach(project => { project.hidden = !visible.includes(project); });
  selected = 0;
  angle = 0;
  velocity = 4;
  turnAnimation = null;
  manualUntil = 0;
  rebuildFaces();
  updateGeometry();
  updateSelection();
  paintRotation();
  document.querySelector('#filter-status').textContent = `${visible.length} ${visible.length === 1 ? 'tarjeta' : 'tarjetas'}`;
  document.querySelectorAll('.card-navigation button').forEach(button => { button.disabled = visible.length < 2; });
  updatePlayback();
}
function moveCard(direction) {
  if (visible.length < 2) return;
  const step = stepAngle();
  const base = turnAnimation ? turnAnimation.to : Math.round(angle / step) * step;
  const to = base + direction * step;
  turnAnimation = { from: angle, to, started: performance.now(), duration: motionPreference.matches ? 0 : 800 };
  manualUntil = performance.now() + 6000;
  if (motionPreference.matches) { angle = to; turnAnimation = null; paintRotation(); updateSelection(true); }
}
function frame(time) {
  const elapsed = previousFrame ? Math.min(time - previousFrame, 50) : 0;
  previousFrame = time;
  animateTicker(elapsed);
  if (!document.hidden && onScreen) {
    if (turnAnimation) {
      const progress = Math.min((time - turnAnimation.started) / turnAnimation.duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      angle = turnAnimation.from + (turnAnimation.to - turnAnimation.from) * eased;
      if (progress === 1) { turnAnimation = null; updateSelection(true); }
      paintRotation();
    } else if (!userPaused && !touching && !(keyboardMode && browser.contains(document.activeElement)) && visible.length > 1 && time > manualUntil) {
      const desiredSpeed = pointerPosition === null ? 4 : pointerRotationSpeed(pointerPosition);
      velocity = desiredSpeed === 0 ? 0 : velocity + (desiredSpeed - velocity) * (1 - Math.exp(-elapsed / 180));
      angle += elapsed * velocity / 1000;
      browser.dataset.rotationSpeed = velocity.toFixed(2);
      paintRotation();
    }
  }
  requestAnimationFrame(frame);
}
filters.forEach(button => button.addEventListener('click', () => filterProjects(button.dataset.filter)));
document.querySelector('.card-prev').addEventListener('click', () => moveCard(-1));
document.querySelector('.card-next').addEventListener('click', () => moveCard(1));
playback.addEventListener('click', () => {
  userPaused = !userPaused;
  updatePlayback();
  // Give control back to the region so focus does not keep a resumed animation paused.
  if (!userPaused) { playback.blur(); browser.blur(); manualUntil = 0; }
});
function updatePointerPosition() {
  if (!onScreen || !mouseCoordinates) { pointerPosition = null; return; }
  const bounds = browser.getBoundingClientRect();
  // Listen across the viewport, including the margins outside the cards.
  // Leaving a card or the content column must not reset edge acceleration.
  const insideBand = mouseCoordinates.y >= bounds.top && mouseCoordinates.y <= bounds.bottom;
  pointerPosition = insideBand ? viewportPointerPosition(mouseCoordinates.x, document.documentElement.clientWidth) : null;
  if (insideBand && !turnAnimation) manualUntil = 0;
}
document.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse') return;
  mouseCoordinates = { x: event.clientX, y: event.clientY };
  keyboardMode = false;
  updatePointerPosition();
}, { passive: true });
document.addEventListener('pointerout', event => {
  if (event.relatedTarget === null) { mouseCoordinates = null; pointerPosition = null; }
});
window.addEventListener('blur', () => { mouseCoordinates = null; pointerPosition = null; });
window.addEventListener('scroll', updatePointerPosition, { passive: true });
window.addEventListener('resize', updatePointerPosition);
document.addEventListener('keydown', () => { keyboardMode = true; });
document.addEventListener('pointerdown', () => { keyboardMode = false; });
browser.addEventListener('focusin', () => {
  // Readable, face-on content while navigating links with a keyboard.
  if (keyboardMode && !turnAnimation) { angle = Math.round(angle / stepAngle()) * stepAngle(); paintRotation(); }
});
browser.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault(); browser.focus({preventScroll:true}); moveCard(event.key === 'ArrowRight' ? 1 : -1);
  }
});
let touchStart;
browser.addEventListener('touchstart', event => {
  touching = true;
  touchStart = {x:event.touches[0].clientX,y:event.touches[0].clientY};
},{passive:true});
browser.addEventListener('touchend', event => {
  touching = false;
  if (!touchStart) return;
  const dx = event.changedTouches[0].clientX - touchStart.x;
  const dy = event.changedTouches[0].clientY - touchStart.y;
  if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) moveCard(dx < 0 ? 1 : -1);
  touchStart = null;
  manualUntil = performance.now() + 7000;
},{passive:true});
browser.addEventListener('touchcancel', () => { touching = false; touchStart = null; });
function revealProject(id, scroll = true) {
  filterProjects('all');
  const index = projects.findIndex(project => project.id === id);
  angle = Math.max(0, index) * stepAngle();
  updateSelection(true);
  paintRotation();
  if (scroll) browser.scrollIntoView({behavior:motionPreference.matches ? 'auto' : 'smooth',block:'start'});
}
function revealHashTarget() {
  const target = projects.find(project => `#${project.id}` === location.hash);
  if (target) revealProject(target.id);
}
document.querySelectorAll('a[href="#contacto"]').forEach(link => link.addEventListener('click', event => {
  event.preventDefault(); closeMenu();
  const contact = document.querySelector('#contacto');
  history.pushState(null,'','#contacto');
  contact.classList.remove('contact-landing');
  contact.scrollIntoView({behavior:motionPreference.matches ? 'auto' : 'smooth',block:'start'});
  clearTimeout(contactTimer);
  contactTimer = setTimeout(() => { contact.classList.add('contact-landing'); contact.focus({preventScroll:true}); },motionPreference.matches ? 0 : 550);
}));
motionPreference.addEventListener('change', event => {
  userPaused = event.matches;
  if (event.matches) { turnAnimation = null; angle = Math.round(angle / stepAngle()) * stepAngle(); paintRotation(); updateSelection(); }
  updatePlayback();
});
new ResizeObserver(updateGeometry).observe(rotor);
new IntersectionObserver(entries => { onScreen = entries[0].isIntersecting; },{threshold:.1}).observe(browser);
document.querySelectorAll('[data-project-total]').forEach(label => { label.textContent = String(projects.length).padStart(2,'0'); });
filterProjects('all');
window.addEventListener('hashchange', revealHashTarget);
revealHashTarget();
requestAnimationFrame(frame);
document.querySelector('#year').textContent = new Date().getFullYear();
initScrollStory();
