// Single-page router: shows one .page section at a time, no document reload.
import {parseRoute, TITLES} from './router-core.js';
const links = [...document.querySelectorAll('.topbar .category[data-route]')];
const sections = [...document.querySelectorAll('.page[data-route]')];
function apply(route, focus) {
  for (const section of sections) section.hidden = section.dataset.route !== route;
  for (const link of links) {
    const active = link.dataset.route === route;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  document.title = TITLES[route] || TITLES.home;
  if (focus) {
    const heading = sections.find(s => s.dataset.route === route)?.querySelector('h1');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({preventScroll: true});
    }
  }
  window.scrollTo(0, 0);
}
function current() {
  return parseRoute(location.hash) || 'home';
}
apply(current(), false);
addEventListener('hashchange', () => {
  const route = parseRoute(location.hash);
  if (route) apply(route, true);
});
