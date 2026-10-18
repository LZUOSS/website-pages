// Pure routing helpers shared by the SPA router and unit tests.
export const ROUTES = ['home', 'calendar', 'projects', 'events', 'members', 'about'];
export const TITLES = {
  home: '首页 · 兰州大学开源社区',
  calendar: '社区日历 · 兰州大学开源社区',
  projects: '开源项目 · 兰州大学开源社区',
  events: '竞赛与会议 · 兰州大学开源社区',
  members: '头像墙 · 兰州大学开源社区',
  about: '关于我们 · 兰州大学开源社区',
};
// Legacy in-page hashes from the multi-page era.
const LEGACY = {events: 'events', about: 'about'};
export function routeToHash(route) {
  return '#/' + route;
}
/** Returns a route id, or null for in-page anchors/unknown hashes that must not change the view. */
export function parseRoute(hash) {
  const key = String(hash ?? '').replace(/^#/, '').replace(/^\//, '').split(/[?&]/)[0].trim().toLowerCase();
  if (!key) return 'home';
  if (ROUTES.includes(key)) return key;
  if (key in LEGACY) return LEGACY[key];
  return null;
}
