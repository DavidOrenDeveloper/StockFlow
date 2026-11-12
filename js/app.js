import { S, init, setCfg, prefetchImages } from './store.js';
import { t, applyDir, setLang } from './i18n.js';
import { ic } from './icons.js';
import { initPWA, applyUpdate } from './pwa.js';
import { openModal, handlePop, navigate } from './modal.js';
import { esc, toast } from './util.js';
import * as catalog from './views/catalog.js';
import * as docs from './views/docs.js';
import * as editor from './views/editor.js';
import * as settings from './views/settings.js';
import * as skuTools from './views/skuTools.js';

let cleanup = null, installEvt = null, backArmedAt = 0;
const NAV = [['catalog', 'box', 'catalog'], ['counts', 'clipboard', 'counts'], ['orders', 'cart', 'orders'], ['files', 'folder', 'files'], ['settings', 'sliders', 'settings']];

function shell() {
  const app = document.getElementById('app');
  app.innerHTML = `<header class="top"><a class="brand" href="#/catalog" style="text-decoration:none;color:inherit"><span class="logo">${ic('box', 20)}</span><span class="bt"><b>${esc(t('brand'))}</b><small class="credit">${S.cfg.lang === 'he' ? 'פותח על ידי דוד אורן' : 'Developed by David Oren'}</small></span></a><span class="grow"></span>
    <a class="btn" href="#/sku" id="skuBtn">${ic('table', 16)} <span>${S.cfg.lang === 'he' ? 'מק"טים' : 'SKUs'}</span></a>
    <button class="btn" id="instBtn" ${installEvt ? '' : 'hidden'}>${ic('download', 16)} <span>${esc(t('install'))}</span></button>
    <div class="seg" role="group" aria-label="language">${[['he', 'עב', 'עברית'], ['en', 'EN', 'English'], ['tr', 'ABC', 'Hebrew in Latin letters']].map(([k, l, ti]) => `<button data-l="${k}" title="${ti}" class="${S.cfg.lang === k ? 'on' : ''}">${l}</button>`).join('')}</div></header>
    <main id="view"></main>
    <nav class="nav">${NAV.map(([k, i, l]) => `<a href="#/${k}" data-n="${k}">${ic(i, 22)}<span>${esc(t(l))}</span></a>`).join('')}</nav>`;
  app.querySelector('.seg').onclick = e => { const b = e.target.closest('[data-l]'); if (b && b.dataset.l !== S.cfg.lang) setLang(b.dataset.l); };
  document.getElementById('instBtn').onclick = async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice.catch(() => {}); installEvt = null; document.getElementById('instBtn').hidden = true; };
}
function route() {
  if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  const [, r = 'catalog', arg] = (location.hash || '#/catalog').slice(1).split('/');
  const view = document.getElementById('view'); view.scrollTop = 0; window.scrollTo(0, 0);
  document.body.dataset.route = r;                       // lets CSS hide the developer credit inside a document (editor) page
  const key = r === 'doc' ? (S.docs.find(d => d.id === arg)?.type === 'order' ? 'orders' : 'counts') : r;
  document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('on', a.dataset.n === key));
  const rerender = () => route();
  if (r === 'counts') cleanup = docs.render(view, { type: 'count' });
  else if (r === 'orders') cleanup = docs.render(view, { type: 'order' });
  else if (r === 'files') cleanup = docs.render(view, { type: 'all' });
  else if (r === 'doc') cleanup = editor.render(view, { id: arg });
  else if (r === 'sku') cleanup = skuTools.render(view);
  else if (r === 'settings') cleanup = settings.render(view, { rerender });
  else if (r === 'new') { location.replace('#/' + (arg === 'order' ? 'orders' : 'counts')); setTimeout(() => docs.createDocDialog(arg === 'order' ? 'order' : 'count', d => navigate('#/doc/' + d.id)), 80); }
  else cleanup = catalog.render(view);
}
// Floating "new version" card at the top of the screen (lives outside #app, so re-renders never remove it).
function showUpdate() {
  if (document.getElementById('updBar')) return;
  const he = S.cfg.lang === 'he', b = document.createElement('div'); b.id = 'updBar'; b.setAttribute('role', 'status');
  b.innerHTML = `<span class="ub-ic">${ic('refresh', 20)}</span><div class="ub-tx"><b>${esc(t('update_ready'))}</b><small>${he ? 'הנתונים שלך נשמרים' : 'Your data is kept'}</small></div><button class="ub-go">${esc(t('update_now'))}</button><button class="ub-x" aria-label="${esc(t('close'))}">${ic('x', 16)}</button>`;
  document.body.appendChild(b); requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add('show')));
  b.querySelector('.ub-go').onclick = applyUpdate;
  b.querySelector('.ub-x').onclick = () => { b.classList.remove('show'); setTimeout(() => b.remove(), 400); };
}
// Android Back: closes the open dialog, otherwise steps back one screen; at the very first screen it asks to press twice before leaving.
function initBack() {
  history.replaceState({ sf: 'base' }, '');
  const arm = () => { try { history.pushState({ sf: 'top' }, ''); } catch (e) { /* ignore */ } };
  addEventListener('pointerdown', arm, { once: true, capture: true });   // browsers only keep history entries created after a user touch
  addEventListener('popstate', e => {
    if (handlePop()) return;
    if (e.state && e.state.sf === 'base') {
      if (Date.now() - backArmedAt < 2200) { history.back(); return; }
      backArmedAt = Date.now(); toast(S.cfg.lang === 'he' ? 'לחצו שוב על חזרה כדי לצאת' : 'Press Back again to exit'); arm();
    }
  });
}
function askName() {
  if (S.cfg.worker || S.cfg.askedName) return;
  const m = openModal({ title: t('welcome'), content: `<label class="fld"><span>${esc(t('your_name'))}</span><input data-n placeholder="${esc(t('worker_ph'))}" autocomplete="name"></label>`,
    actions: `<button class="btn" data-skip>${esc(t('skip_now'))}</button><button class="btn primary" data-ok>${esc(t('continue'))}</button>`, onClose: () => setCfg({ askedName: true }) });
  m.$('[data-skip]').onclick = () => m.close(); m.$('[data-ok]').onclick = async () => { await setCfg({ worker: m.$('[data-n]').value.trim(), askedName: true }); m.close(); };
}
async function boot() {
  try { await init(); } catch (e) { console.error(e); document.getElementById('app').innerHTML = `<div class="boot-error"><h2>⚠️</h2><p>${esc(e.message || e)}</p><button class="btn primary" onclick="location.reload()">Reload</button></div>`; return; }
  applyDir(); shell(); route(); askName(); initBack();
  window.addEventListener('hashchange', route);
  window.addEventListener('sc-rerender', () => { shell(); route(); });
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; const b = document.getElementById('instBtn'); if (b) b.hidden = false; });
  window.addEventListener('appinstalled', () => { installEvt = null; toast(t('installed')); const b = document.getElementById('instBtn'); if (b) b.hidden = true; });
  initPWA(showUpdate);
  setTimeout(prefetchImages, 4000);
}
boot();
