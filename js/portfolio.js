const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() {
  navigation.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.querySelector('span').textContent = '+';
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  navigation.classList.toggle('is-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.querySelector('span').textContent = open ? '−' : '+';
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
let selected = 0;
let angle = 0;
let userPaused = motionPreference.matches;
let hovered = false;
let touching = false;
let onScreen = false;
let manualUntil = 0;
let turnAnimation = null;
let previousFrame = 0;
let contactTimer;

function stepAngle() { return 360 / visible.length; }
function updateGeometry() {
  const width = rotor.getBoundingClientRect().width;
  // offsetWidth is independent of the current 3D rotation.
  const faceWidth = rotor.offsetWidth || width;
  const radius = visible.length > 2 ? faceWidth / (2 * Math.tan(Math.PI / visible.length)) : visible.length === 2 ? faceWidth * .13 : 0;
  rotor.style.setProperty('--radius', `${radius}px`);
  visible.forEach((project, index) => project.style.setProperty('--face-angle', `${index * stepAngle()}deg`));
}
function updateSelection(announce = false) {
  const step = stepAngle();
  selected = ((Math.round(angle / step) % visible.length) + visible.length) % visible.length;
  projects.forEach(project => {
    const active = project === visible[selected];
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
  const next = ((Math.round(angle / stepAngle()) % visible.length) + visible.length) % visible.length;
  if (selected !== next) updateSelection();
}
function updatePlayback() {
  playback.setAttribute('aria-pressed', String(userPaused));
  playback.innerHTML = userPaused ? 'Reanudar giro <span aria-hidden="true">▶</span>' : 'Pausar giro <span aria-hidden="true">Ⅱ</span>';
  playback.disabled = visible.length < 2;
}
function filterProjects(category) {
  filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
  visible = projects.filter(project => category === 'all' || project.dataset.category === category);
  projects.forEach(project => { project.hidden = !visible.includes(project); });
  selected = 0;
  angle = 0;
  turnAnimation = null;
  manualUntil = performance.now() + 5000;
  updateGeometry();
  updateSelection();
  paintRotation();
  document.querySelector('#filter-status').textContent = `${visible.length} ${visible.length === 1 ? 'proyecto' : 'proyectos'}`;
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
  if (!document.hidden && onScreen) {
    if (turnAnimation) {
      const progress = Math.min((time - turnAnimation.started) / turnAnimation.duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      angle = turnAnimation.from + (turnAnimation.to - turnAnimation.from) * eased;
      if (progress === 1) { turnAnimation = null; updateSelection(true); }
      paintRotation();
    } else if (!userPaused && !hovered && !touching && !browser.contains(document.activeElement) && visible.length > 1 && time > manualUntil) {
      angle += elapsed * .004; // One gentle revolution every 90 seconds.
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
browser.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') hovered = true; });
browser.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') hovered = false; });
browser.addEventListener('focusin', () => {
  // Readable, face-on content while navigating links with a keyboard.
  if (!turnAnimation) { angle = Math.round(angle / stepAngle()) * stepAngle(); paintRotation(); }
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
document.querySelectorAll('.deck-card').forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  history.pushState(null,'',link.hash);
  revealProject(link.hash.slice(1));
}));
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
filterProjects('all');
window.addEventListener('hashchange', revealHashTarget);
revealHashTarget();
requestAnimationFrame(frame);
document.querySelector('#year').textContent = new Date().getFullYear();
