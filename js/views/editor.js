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
      <div class="ttl"><b id="ttl"></b><small id="sub"></small></div><span class="grow"></span><span class="st" id="stChip"></span></div>
    <details class="card meta" id="meta"><summary>${ic('sliders', 18)} ${esc(t('details'))}</summary><div class="metagrid">
      <label class="fld"><span>${esc(t('site'))}</span><select data-m="site">${S.sites.map(s => `<option value="${s.id}">${esc(nm(s, 'he'))}${s.en ? ' · ' + esc(s.en) : ''}</option>`).join('')}</select></label>
      <label class="fld"><span>${esc(t('date'))}</span><input type="date" data-m="date"></label>
      <label class="fld"><span>${esc(t('worker'))}</span><input data-m="worker"></label>
      <label class="fld"><span>${esc(t('status'))}</span><select data-m="status">${DOC_STATUS[doc.type].map(s => `<option value="${s}">${esc(t('st_' + s))}</option>`).join('')}</select></label>
      <label class="fld"><span>${esc(t('folder'))}</span><select data-m="folder"><option value="">${esc(t('no_folder'))}</option>${S.folders.map(f => `<option value="${f.id}">${esc(f.name)}</option>`).join('')}</select></label>
      <label class="fld wide"><span>${esc(t('note'))}</span><input data-m="note"></label></div></details>
    <div class="bar tight"><div class="searchbox">${ic('search', 18)}<input id="q" type="search" placeholder="${esc(t('search_ph'))}" autocomplete="off"><button class="icon-btn" id="qx" hidden>${ic('x', 16)}</button></div></div>
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
  const stats = () => { const n = Object.keys(doc.lines).length, tot = S.items.length; return { n, tot, ord: Object.values(doc.lines).filter(v => v > 0).length }; };
  function progress() {
    const s = stats(), pct = isCount ? s.n / (s.tot || 1) : Math.min(1, s.ord / 12);
    $('#pfill').style.width = (isCount ? pct * 100 : (s.ord ? 100 : 0)) + '%';
    $('#ptxt').textContent = isCount ? t('counted_of', { n: s.n, t: s.tot }) : t('ordered_lines', { n: s.ord });
  }
  function filters() {
    const s = stats();
    $('#fl').innerHTML = isCount
      ? [['all', t('all')], ['uncounted', `${t('show_uncounted')} (${s.tot - s.n})`], ['counted', t('counted')], ['short', t('below_emergency')]].map(([k, l]) => `<button class="pill ${flt === k ? 'on' : ''}" data-fl="${k}">${esc(l)}</button>`).join('')
      : [['all', t('all')], ['ordered', `${t('ordered')} (${s.ord})`], ['short', t('below_emergency')]].map(([k, l]) => `<button class="pill ${flt === k ? 'on' : ''}" data-fl="${k}">${esc(l)}</button>`).join('');
    $('#cats').innerHTML = `<button class="pill ${!cat ? 'on' : ''}" data-c="">${esc(t('all_cats'))}</button>` + S.cats.map(c => `<button class="pill ${cat === c.id ? 'on' : ''}" data-c="${c.id}">${esc(nm(c))}</button>`).join('');
  }
  const passes = it => {
    if (cat && it.cat !== cat) return false; const v = doc.lines[it.id];
    if (flt === 'uncounted') return v == null; if (flt === 'counted') return v != null; if (flt === 'ordered') return v > 0;
    if (flt === 'short') return it.emergency != null && (isCount ? (v != null && v < it.emergency) : (prev?.lines[it.id] ?? 0) < it.emergency);
    return true;
  };
  function rowHtml(it) {
    const v = doc.lines[it.id], u = imgOf(it), pc = prev?.lines[it.id], sug = !isCount && it.emergency != null && pc != null && pc < it.emergency ? it.emergency - pc : null;
    const low = it.emergency != null && ((isCount && v != null && v < it.emergency));
    return `<div class="row ${v == null ? '' : v === 0 ? 'zero' : 'has'} ${low ? 'low' : ''}" data-id="${it.id}">
      <button class="thumb" data-zoom="${it.id}">${u ? `<img loading="lazy" src="${u}" alt="">` : ic('image', 24)}</button>
      <div class="info"><div class="n1">${esc(nm(it))}</div><div class="n2">${it.sku ? `<span class="mono">${esc(it.sku)}</span> · ` : ''}${esc(nm(unitOf(it.unit)))}${it.emergency != null ? ` · ${esc(t('emergency'))} ${fmtQty(it.emergency)}` : ''}${!isCount && pc != null ? ` · ${esc(t('in_stock'))} ${fmtQty(pc)}` : ''}</div>
        ${sug ? `<button class="sug" data-sug="${sug}">${esc(t('fill_short', { n: fmtQty(sug) }))}</button>` : ''}</div>
      <div class="qty"><button data-dec aria-label="-">${ic('minus', 18)}</button><input inputmode="decimal" autocomplete="off" value="${v == null ? '' : fmtQty(v)}" placeholder="${isCount ? '—' : '0'}" aria-label="${esc(nm(it))}"><button data-inc aria-label="+">${ic('plus', 18)}</button>${isCount && v != null ? `<button class="clr" data-clr title="${esc(t('uncount'))}">${ic('x', 14)}</button>` : ''}</div></div>`;
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
    let clr = rowEl.querySelector('.clr'); if (isCount) { if (v != null && !clr) rowEl.querySelector('.qty').insertAdjacentHTML('beforeend', `<button class="clr" data-clr>${ic('x', 14)}</button>`); if (v == null && clr) clr.remove(); }
    progress(); autosave(); const sv = $('#saved'); if (sv) sv.textContent = '…';
  }
  $('#list').addEventListener('input', e => { if (e.target.tagName !== 'INPUT') return; const row = e.target.closest('.row'); const raw = e.target.value.replace(',', '.'); setQty(row, raw.trim() === '' ? null : (num(raw) != null && num(raw) >= 0 ? num(raw) : doc.lines[row.dataset.id] ?? null)); });
  $('#list').addEventListener('focusout', e => { if (e.target.tagName === 'INPUT') { const row = e.target.closest('.row'), v = doc.lines[row.dataset.id]; e.target.value = v == null ? '' : fmtQty(v); } });
  $('#list').addEventListener('focusin', e => { if (e.target.tagName === 'INPUT') e.target.select(); });
  $('#list').addEventListener('click', e => {
    const row = e.target.closest('.row'); if (!row) return; const id = row.dataset.id, cur = doc.lines[id];
    if (e.target.closest('[data-zoom]')) { const it = S.byId.get(id); zoomImg(imgOf(it), nm(it)); }
    else if (e.target.closest('[data-inc]')) setQty(row, (cur ?? 0) + 1);
    else if (e.target.closest('[data-dec]')) setQty(row, Math.max(0, (cur ?? 1) - 1));
    else if (e.target.closest('[data-clr]')) setQty(row, null);
    else if (e.target.closest('[data-sug]')) setQty(row, +e.target.closest('[data-sug]').dataset.sug);
  });
  $('#fl').onclick = e => { const b = e.target.closest('[data-fl]'); if (b) { flt = b.dataset.fl; filters(); draw(); } };
  $('#cats').onclick = e => { const b = e.target.closest('[data-c]'); if (b) { cat = b.dataset.c; filters(); draw(); } };
  $('#q').oninput = debounce(e => { q = e.target.value; $('#qx').hidden = !q; draw(); }, 120);
  $('#qx').onclick = () => { $('#q').value = ''; q = ''; $('#qx').hidden = true; draw(); };
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
