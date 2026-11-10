// Stock-count / order editor. Empty = not checked yet; 0 = checked, none. Auto-saves as draft after every change.
import { S, nm, catOf, unitOf, imgOf, runSearch, saveDoc, setStatus, siteOf, DOC_STATUS, lastCount, orderFromCount, deleteDoc, log } from '../store.js';
import { t } from '../i18n.js';
import { esc, debounce, num, fmtQty, fmtDateTime, toast } from '../util.js';
import { ic } from '../icons.js';
import { zoomImg, confirmDlg, menu } from '../modal.js';
import { exportDialog } from './exportDialog.js';

export function render(root, { id }) {
  const doc = S.docs.find(d => d.id === id);
  if (!doc) { root.innerHTML = `<div class="page"><div class="empty"><p>${esc(t('not_found'))}</p><a class="btn primary" href="#/files">${esc(t('back'))}</a></div></div>`; return; }
  const isCount = doc.type === 'count';
  let q = '', cat = '', flt = 'all', saved = doc.updatedAt;
  const prev = isCount ? null : lastCount(doc.site, doc.id);
  root.innerHTML = `<div class="page editor">
    <div class="bar sticky tight"><a class="icon-btn" href="#/${isCount ? 'counts' : 'orders'}" aria-label="${esc(t('back'))}">${ic('back', 22)}</a>
      <div class="ttl"><b id="ttl"></b><small id="sub"></small></div><span class="grow"></span><button class="btn sm" id="undoBtn" disabled><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/></svg> <span>${S.cfg.lang === 'he' ? 'בטל' : 'Undo'}</span></button><span class="st" id="stChip"></span></div>
    <details class="card meta" id="meta"><summary>${ic('sliders', 18)} ${esc(t('details'))}</summary><div class="metagrid">
      <label class="fld"><span>${esc(t('site'))}</span><select data-m="site">${S.sites.map(s => `<option value="${s.id}">${esc(nm(s, 'he'))}${s.en ? ' · ' + esc(s.en) : ''}</option>`).join('')}</select></label>
      <label class="fld"><span>${esc(t('date'))}</span><input type="date" data-m="date"></label>
      <label class="fld"><span>${esc(t('worker'))}</span><input data-m="worker"></label>
      <label class="fld"><span>${esc(t('status'))}</span><select data-m="status">${DOC_STATUS[doc.type].map(s => `<option value="${s}">${esc(t('st_' + s))}</option>`).join('')}</select></label>
      <label class="fld"><span>${esc(t('folder'))}</span><select data-m="folder"><option value="">${esc(t('no_folder'))}</option>${S.folders.map(f => `<option value="${f.id}">${esc(f.name)}</option>`).join('')}</select></label>
      <label class="fld wide"><span>${esc(t('note'))}</span><input data-m="note"></label></div></details>
    <div class="bar tight"><div class="searchbox">${ic('search', 18)}<input id="q" type="search" placeholder="${esc(t('search_ph'))}" autocomplete="off"><button class="icon-btn" id="qx" hidden>${ic('x', 16)}</button></div><button class="btn" id="cartBtn" title="${S.cfg.lang === 'he' ? 'סל: רק מה שנוסף עד עכשיו' : 'Basket: only what was added so far'}">${ic('cart', 20)} <b id="cartN">0</b></button></div>
    <div class="chips-row" id="fl"></div><div class="chips-row" id="cats"></div>
    <div id="list"></div>
    <div class="footbar"><div class="progress"><div class="pbar"><i id="pfill"></i></div><span id="ptxt"></span><small id="saved"></small></div>
      <div class="btnrow"><button class="btn" id="saveBtn">${ic('check', 18)} <span>${esc(t('save_draft'))}</span></button>
      ${isCount ? `<button class="btn" id="mkOrder" title="${esc(t('order_from_count'))}">${ic('cart', 18)}</button>` : ''}
      <button class="btn" id="exp">${ic('download', 18)} <span>${esc(t('export'))}</span></button>
      <button class="btn primary" id="done">${ic('check', 18)} <span>${esc(isCount ? t('finish_count') : t('mark_submitted'))}</span></button></div></div></div>`;
  const $ = s => root.querySelector(s);
  // meta bindings
  $$('[data-m]').forEach(el => { el.value = doc[el.dataset.m] ?? ''; el.onchange = async () => { doc[el.dataset.m] = el.value; if (el.dataset.m === 'status') await log('status', el.value, doc.id); await persist(); head(); }; });
  function $$(s) { return [...root.querySelectorAll(s)]; }
  const head = () => { $('#ttl').textContent = `${isCount ? t('count') : t('order')} · ${nm(siteOf(doc.site), 'he') || ''}`; $('#sub').textContent = `${doc.date}${doc.worker ? ' · ' + doc.worker : ''}`; const c = $('#stChip'); c.className = 'st st-' + doc.status; c.textContent = t('st_' + doc.status); };
  const persist = async () => { await saveDoc(doc, { quiet: true }); saved = doc.updatedAt; const sv = $('#saved'); if (sv) sv.textContent = t('saved_at', { x: fmtDateTime(saved, S.cfg.lang).split(', ').pop() }); };
  const autosave = debounce(persist, 450);
  const undo = []; let typed = null;
  const push = e => { undo.push(e); if (undo.length > 100) undo.shift(); $('#undoBtn').disabled = false; };
  function undoLast() {
    const e = undo.pop(); $('#undoBtn').disabled = !undo.length; if (!e) return;
    if ('h' in e) { if (e.h) (doc.hidden ||= {})[e.id] = true; else if (doc.hidden) delete doc.hidden[e.id]; if (!hidN()) flt = flt === 'hidden' ? 'all' : flt; persist(); filters(); draw(); progress(); return; }
    const row = root.querySelector(`.row[data-id="${e.id}"]`);
    if (row) setQty(row, e.v ?? null); else { if (e.v == null) delete doc.lines[e.id]; else doc.lines[e.id] = e.v; progress(); autosave(); }
    toast(S.cfg.lang === 'he' ? 'הפעולה האחרונה בוטלה' : 'Last action undone');
  }
  const hidN = () => Object.keys(doc.hidden || {}).filter(id => S.byId.has(id)).length;
  const hidPill = () => [['hidden', `${S.cfg.lang === 'he' ? 'מוסתרים' : 'Hidden'} (${hidN()})`]];
  const hideBtn = it => `<button class="btn sm" style="padding:1px 8px;font-size:11px;margin-top:3px" ${doc.hidden?.[it.id] ? 'data-unhide' : 'data-hide'}>${S.cfg.lang === 'he' ? (doc.hidden?.[it.id] ? 'החזר למסמך' : 'הסתר ממסמך זה') : (doc.hidden?.[it.id] ? 'Restore' : 'Hide from this doc')}</button>`;
  const stats = () => { const n = Object.keys(doc.lines).filter(id => !doc.hidden?.[id]).length, tot = S.items.length - hidN(); return { n, tot, ord: Object.values(doc.lines).filter(v => v > 0).length }; };
  function progress() {
    const s = stats(), pct = isCount ? s.n / (s.tot || 1) : Math.min(1, s.ord / 12);
    { const cn = $('#cartN'); if (cn) cn.textContent = isCount ? s.n : s.ord; }
    $('#pfill').style.width = (isCount ? pct * 100 : (s.ord ? 100 : 0)) + '%';
    $('#ptxt').textContent = isCount ? t('counted_of', { n: s.n, t: s.tot }) : t('ordered_lines', { n: s.ord });
  }
  function filters() {
    const s = stats(); { const cb = $('#cartBtn'); if (cb) cb.classList.toggle('primary', flt === 'added'); }
    $('#fl').innerHTML = isCount
      ? [['all', t('all')], ['uncounted', `${t('show_uncounted')} (${s.tot - s.n})`], ['counted', t('counted')], ['short', t('below_emergency')], ['img', S.cfg.lang === 'he' ? 'רק עם תמונה' : 'With image only'], ...hidPill()].map(([k, l]) => `<button class="pill ${flt === k ? 'on' : ''}" data-fl="${k}">${esc(l)}</button>`).join('')
      : [['all', t('all')], ['ordered', `${t('ordered')} (${s.ord})`], ['short', t('below_emergency')], ['img', S.cfg.lang === 'he' ? 'רק עם תמונה' : 'With image only'], ...hidPill()].map(([k, l]) => `<button class="pill ${flt === k ? 'on' : ''}" data-fl="${k}">${esc(l)}</button>`).join('');
    $('#cats').innerHTML = `<button class="pill ${!cat ? 'on' : ''}" data-c="">${esc(t('all_cats'))}</button>` + S.cats.map(c => `<button class="pill ${cat === c.id ? 'on' : ''}" data-c="${c.id}">${esc(nm(c))}</button>`).join('');
  }
  const passes = it => {
    if (cat && it.cat !== cat) return false; const v = doc.lines[it.id];
    if (flt === 'hidden') return !!doc.hidden?.[it.id]; if (doc.hidden?.[it.id]) return false;
    if (flt === 'added') return isCount ? v != null : v > 0;
    if (flt === 'img' && !imgOf(it)) return false;
    if (flt === 'uncounted') return v == null; if (flt === 'counted') return v != null; if (flt === 'ordered') return v > 0;
    if (flt === 'short') return it.emergency != null && (isCount ? (v != null && v < it.emergency) : (prev?.lines[it.id] ?? 0) < it.emergency);
    return true;
  };
  function rowHtml(it) {
    const v = doc.lines[it.id], u = imgOf(it), pc = prev?.lines[it.id], sug = !isCount && it.emergency != null && pc != null && pc < it.emergency ? it.emergency - pc : null;
    const low = it.emergency != null && ((isCount && v != null && v < it.emergency));
    return `<div class="row ${v == null ? '' : v === 0 ? 'zero' : 'has'} ${low ? 'low' : ''}" data-id="${it.id}">
      <button class="thumb" data-zoom="${it.id}">${u ? `<img loading="lazy" src="${u}" alt="">` : ic('image', 24)}</button>
      <div class="info"><div class="n1">${esc(nm(it))}</div>${it.sku ? `<div class="sku">${esc(t('sku'))}: <span class="mono">${esc(it.sku)}</span></div>` : ''}<div class="n2">${S.cfg.lang === 'he' ? 'יחידת מידה' : 'Unit'}: <b>${esc(nm(unitOf(it.unit)))}</b>${!isCount && pc != null ? ` · ${esc(t('in_stock'))} ${fmtQty(pc)}` : ''}</div>${isCount && it.emergency != null ? `<div class="lowtag">${S.cfg.lang === 'he' ? 'מתחת למינימום' : 'Below minimum'} (${fmtQty(it.emergency)})</div>` : ''}
        ${sug ? `<button class="sug" data-sug="${sug}">${esc(t('fill_short', { n: fmtQty(sug) }))}</button>` : ''}${hideBtn(it)}</div>
      <div class="qty"><button data-dec aria-label="-">${ic('minus', 18)}</button><input inputmode="decimal" autocomplete="off" value="${v == null ? '' : fmtQty(v)}" placeholder="${isCount ? '—' : '0'}" aria-label="${esc(nm(it))}"><button data-inc aria-label="+">${ic('plus', 18)}</button>${isCount ? `<button class="clr" data-clr style="visibility:${v != null ? 'visible' : 'hidden'}" title="${esc(t('uncount'))}">${ic('x', 14)}</button>` : ''}</div></div>`;
  }
  function draw() {
    let html = '';
    if (q.trim()) {
      const r = runSearch(q), ex = r.exact.filter(x => passes(x.it)), ap = r.approx.filter(x => passes(x.it));
      if (ex.length) html += `<h3 class="grp">${esc(t('exact_matches'))}</h3>${ex.map(x => rowHtml(x.it)).join('')}`;
      if (ap.length) html += `<h3 class="grp soft">${esc(t('similar_matches'))}</h3>${ap.map(x => rowHtml(x.it)).join('')}`;
      if (!ex.length && !ap.length) html = `<div class="empty"><p>${esc(t('no_results'))}</p></div>`;
    } else {
      for (const c of S.cats) { const its = S.items.filter(i => i.cat === c.id && passes(i)); if (its.length) html += `<h3 class="grp">${esc(nm(c))} <b>${its.length}</b></h3>${its.map(rowHtml).join('')}`; }
      if (!html) html = `<div class="empty"><p>${esc(flt === 'uncounted' ? t('all_counted') : t('no_results'))}</p></div>`;
    }
    $('#list').innerHTML = html;
  }
  function setQty(rowEl, v) {
    const id = rowEl.dataset.id; if (v == null) delete doc.lines[id]; else doc.lines[id] = v;
    rowEl.classList.toggle('has', v != null && v !== 0); rowEl.classList.toggle('zero', v === 0);
    const it = S.byId.get(id); rowEl.classList.toggle('low', !!(isCount && it?.emergency != null && v != null && v < it.emergency));
    const inp = rowEl.querySelector('input'); if (document.activeElement !== inp) inp.value = v == null ? '' : fmtQty(v);
    const clr = rowEl.querySelector('.clr'); if (clr) clr.style.visibility = v != null ? 'visible' : 'hidden';
    progress(); autosave(); const sv = $('#saved'); if (sv) sv.textContent = '…';
  }
  $('#list').addEventListener('input', e => { if (e.target.tagName !== 'INPUT') return; const row = e.target.closest('.row'); if (typed !== row.dataset.id) { push({ id: row.dataset.id, v: doc.lines[row.dataset.id] }); typed = row.dataset.id; } const raw = e.target.value.replace(',', '.'); setQty(row, raw.trim() === '' ? null : (num(raw) != null && num(raw) >= 0 ? num(raw) : doc.lines[row.dataset.id] ?? null)); });
  $('#list').addEventListener('focusout', e => { if (e.target.tagName === 'INPUT') { const row = e.target.closest('.row'), v = doc.lines[row.dataset.id]; e.target.value = v == null ? '' : fmtQty(v); } });
  $('#list').addEventListener('focusin', e => { if (e.target.tagName === 'INPUT') { typed = null; e.target.select(); } });
  $('#list').addEventListener('click', e => {
    const row = e.target.closest('.row'); if (!row) return; const id = row.dataset.id, cur = doc.lines[id];
    if (e.target.closest('[data-inc],[data-dec],[data-clr],[data-sug]')) push({ id, v: cur });
    if (e.target.closest('[data-hide]')) push({ id, h: false }); if (e.target.closest('[data-unhide]')) push({ id, h: true });
    if (e.target.closest('[data-zoom]')) { const it = S.byId.get(id); zoomImg(imgOf(it), nm(it)); }
    else if (e.target.closest('[data-inc]')) setQty(row, (cur ?? 0) + 1);
    else if (e.target.closest('[data-dec]')) setQty(row, Math.max(0, (cur ?? 1) - 1));
    else if (e.target.closest('[data-clr]')) setQty(row, null);
    else if (e.target.closest('[data-hide]')) { (doc.hidden ||= {})[id] = true; persist(); filters(); draw(); progress(); }
    else if (e.target.closest('[data-unhide]')) { delete doc.hidden[id]; if (!hidN()) flt = 'all'; persist(); filters(); draw(); progress(); }
    else if (e.target.closest('[data-sug]')) setQty(row, +e.target.closest('[data-sug]').dataset.sug);
  });
  $('#fl').onclick = e => { const b = e.target.closest('[data-fl]'); if (b) { flt = b.dataset.fl; filters(); draw(); } };
  $('#cats').onclick = e => { const b = e.target.closest('[data-c]'); if (b) { cat = b.dataset.c; filters(); draw(); } };
  $('#q').oninput = debounce(e => { q = e.target.value; $('#qx').hidden = !q; draw(); }, 120);
  $('#qx').onclick = () => { $('#q').value = ''; q = ''; $('#qx').hidden = true; draw(); };
  $('#undoBtn').onclick = undoLast;
  $('#cartBtn').onclick = () => { flt = flt === 'added' ? 'all' : 'added'; filters(); draw(); progress(); };
  $('#saveBtn').onclick = async () => { await persist(); toast(t('draft_saved')); };
  $('#exp').onclick = async () => { await persist(); exportDialog({ kind: 'doc', doc }); };
  $('#done').onclick = async () => {
    const s = stats();
    if (isCount) { if (s.tot - s.n > 0 && !(await confirmDlg(t('uncounted_warn', { n: s.tot - s.n })))) { flt = 'uncounted'; filters(); draw(); return; } await setStatus(doc, 'completed'); }
    else await setStatus(doc, doc.status === 'draft' ? 'submitted' : 'completed');
    $$('[data-m="status"]')[0].value = doc.status; head(); toast(t('saved')); exportDialog({ kind: 'doc', doc });
  };
  const mk = $('#mkOrder'); if (mk) mk.onclick = async () => { const o = orderFromCount(doc); if (!Object.keys(o.lines).length) { toast(t('no_shortage')); return; } await saveDoc(o); await log('doc+', 'order from count', o.id); location.hash = '#/doc/' + o.id; };
  const vis = () => { if (document.hidden) persist(); }; document.addEventListener('visibilitychange', vis);
  head(); filters(); progress(); draw(); $('#saved').textContent = t('saved_at', { x: fmtDateTime(saved, S.cfg.lang).split(', ').pop() });
  return () => { document.removeEventListener('visibilitychange', vis); persist(); };
}
