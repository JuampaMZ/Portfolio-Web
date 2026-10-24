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
let selected = 0;
let visible = [...projects];
function renderCards() {
  projects.forEach(project => {
    const index = visible.indexOf(project);
    const active = index === selected;
    project.hidden = index === -1;
    project.inert = !active;
    project.setAttribute('aria-hidden', String(!active));
    project.classList.toggle('is-active', active);
    project.classList.toggle('is-before', index !== -1 && !active && index === (selected + visible.length - 1) % visible.length);
    project.classList.toggle('is-after', index !== -1 && !active && index !== (selected + visible.length - 1) % visible.length);
  });
  const title = visible[selected].querySelector('h3').textContent;
  document.querySelector('#card-position').textContent = `${String(selected + 1).padStart(2,'0')} / ${String(visible.length).padStart(2,'0')} · ${title}`;
  document.querySelectorAll('.card-navigation button').forEach(button => button.disabled = visible.length < 2);
}
function filterProjects(category) {
  filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
  visible = projects.filter(project => category === 'all' || project.dataset.category === category);
  selected = 0;
  document.querySelector('#filter-status').textContent = `${visible.length} ${visible.length === 1 ? 'proyecto' : 'proyectos'}`;
  renderCards();
}
function moveCard(direction) { selected = (selected + direction + visible.length) % visible.length; renderCards(); }
filters.forEach(button => button.addEventListener('click', () => filterProjects(button.dataset.filter)));
document.querySelector('.card-prev').addEventListener('click', () => moveCard(-1));
document.querySelector('.card-next').addEventListener('click', () => moveCard(1));
browser.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); browser.focus({preventScroll:true}); moveCard(event.key === 'ArrowRight' ? 1 : -1); }
});
let touchStart;
browser.addEventListener('touchstart', event => { touchStart = {x:event.touches[0].clientX,y:event.touches[0].clientY}; },{passive:true});
browser.addEventListener('touchend', event => {
  if (!touchStart) return;
  const dx = event.changedTouches[0].clientX - touchStart.x;
  const dy = event.changedTouches[0].clientY - touchStart.y;
  if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) moveCard(dx < 0 ? 1 : -1);
  touchStart = null;
},{passive:true});
browser.addEventListener('touchcancel', () => { touchStart = null; });
function revealProject(id) {
  filterProjects('all');
  selected = projects.findIndex(project => project.id === id);
  if (selected < 0) selected = 0;
  renderCards();
}
document.querySelectorAll('.deck-card').forEach(link => link.addEventListener('click', () => revealProject(link.hash.slice(1))));
function revealHashTarget() {
  const target = projects.find(project => `#${project.id}` === window.location.hash);
  if (target) { revealProject(target.id); browser.scrollIntoView({block:'start'}); }
}
renderCards();
window.addEventListener('hashchange', revealHashTarget);
revealHashTarget();
document.querySelector('#year').textContent = new Date().getFullYear();
