import { esc } from './util.js';
import { t } from './i18n.js';
import { ic } from './icons.js';
const root = () => document.getElementById('modalRoot');
/** Opens a modal. content: html string. Returns {el, close}. */
export function openModal({ title = '', content = '', wide = false, actions = '', onClose, cls = '' }) {
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="modal ${wide ? 'wide' : ''} ${cls}" role="dialog" aria-modal="true"><header><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="${esc(t('close'))}">${ic('x')}</button></header><div class="mbody">${content}</div>${actions ? `<footer>${actions}</footer>` : ''}</div>`;
  root().appendChild(ov); document.body.classList.add('noscroll');
  const close = v => { ov.remove(); if (!root().children.length) document.body.classList.remove('noscroll'); onClose && onClose(v); };
  ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
  ov.querySelector('[data-close]').onclick = () => close();
  ov.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  return { el: ov, close, $: s => ov.querySelector(s), $$: s => [...ov.querySelectorAll(s)] };
}
export const confirmDlg = (msg, { ok = t('ok'), danger = false, title = '' } = {}) => new Promise(res => {
  let done = false; const fin = v => { if (!done) { done = true; res(v); } };
  const m = openModal({ title: title || t('confirm'), content: `<p class="msg">${esc(msg)}</p>`, actions: `<button class="btn" data-no>${esc(t('cancel'))}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-yes>${esc(ok)}</button>`, onClose: () => fin(false) });
  m.$('[data-no]').onclick = () => m.close(); m.$('[data-yes]').onclick = () => { fin(true); m.close(); };
});
export const alertDlg = (msg, title = '') => new Promise(res => { const m = openModal({ title: title || t('notice'), content: `<p class="msg">${esc(msg)}</p>`, actions: `<button class="btn primary" data-yes>${esc(t('ok'))}</button>`, onClose: res }); m.$('[data-yes]').onclick = () => m.close(); });
export const promptDlg = (title, value = '', label = '') => new Promise(res => {
  let done = false; const fin = v => { if (!done) { done = true; res(v); } };
  const m = openModal({ title, content: `<label class="fld"><span>${esc(label)}</span><input data-v value="${esc(value)}"></label>`, actions: `<button class="btn" data-no>${esc(t('cancel'))}</button><button class="btn primary" data-yes>${esc(t('ok'))}</button>`, onClose: () => fin(null) });
  const inp = m.$('[data-v]'); setTimeout(() => inp.focus(), 50);
  m.$('[data-no]').onclick = () => m.close(); const go = () => { fin(inp.value.trim()); m.close(); }; m.$('[data-yes]').onclick = go; inp.onkeydown = e => { if (e.key === 'Enter') go(); };
});
/** zoomable image viewer: double-tap/click toggles zoom, wheel zooms, buttons +/-, pan by scrolling */
export function zoomImg(src, caption = '') {
  if (!src) return;
  const m = openModal({ title: caption, cls: 'zoom', wide: true, content: `<div class="zoomwrap"><img src="${src}" alt=""></div><div class="zoombar"><button class="btn" data-z="-">${ic('minus')}</button><span data-pct>100%</span><button class="btn" data-z="+">${ic('plus')}</button></div>` });
  const wrap = m.$('.zoomwrap'), img = m.$('img'), pct = m.$('[data-pct]'); let z = 1;
  const set = (v, ax = .5, ay = .5) => { const ow = img.offsetWidth; const cx = (wrap.scrollLeft + wrap.clientWidth * ax) / (ow || 1); const cy = (wrap.scrollTop + wrap.clientHeight * ay) / (img.offsetHeight || 1); z = Math.max(1, Math.min(6, v)); img.style.width = (z * 100) + '%'; img.style.maxWidth = z > 1 ? 'none' : '100%'; pct.textContent = Math.round(z * 100) + '%'; wrap.scrollLeft = cx * img.offsetWidth - wrap.clientWidth * ax; wrap.scrollTop = cy * img.offsetHeight - wrap.clientHeight * ay; };
  m.$$('[data-z]').forEach(b => b.onclick = () => set(z + (b.dataset.z === '+' ? .5 : -.5)));
  img.ondblclick = e => { const r = wrap.getBoundingClientRect(); set(z > 1 ? 1 : 3, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); };
  wrap.addEventListener('wheel', e => { e.preventDefault(); set(z + (e.deltaY < 0 ? .3 : -.3)); }, { passive: false });
  let last = 0; img.addEventListener('touchend', e => { const n = Date.now(); if (n - last < 300) { img.ondblclick(e.changedTouches[0]); e.preventDefault(); } last = n; });
}
export function menu(anchor, entries) { // small popup menu: entries [{label, icon, onClick, danger}]
  document.querySelectorAll('.popmenu').forEach(x => x.remove());
  const m = document.createElement('div'); m.className = 'popmenu';
  m.innerHTML = entries.map((e, i) => `<button data-i="${i}" class="${e.danger ? 'danger' : ''}">${e.icon ? ic(e.icon, 18) : ''}<span>${esc(e.label)}</span></button>`).join('');
  document.body.appendChild(m);
  const r = anchor.getBoundingClientRect(), rtl = document.documentElement.dir === 'rtl';
  m.style.top = Math.min(r.bottom + 4, innerHeight - m.offsetHeight - 8) + 'px';
  m.style[rtl ? 'left' : 'right'] = Math.max(8, rtl ? r.left : innerWidth - r.right) + 'px';
  const off = ev => { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('pointerdown', off, true); } };
  setTimeout(() => document.addEventListener('pointerdown', off, true), 0);
  m.onclick = e => { const b = e.target.closest('button'); if (!b) return; m.remove(); document.removeEventListener('pointerdown', off, true); entries[+b.dataset.i].onClick(); };
}
