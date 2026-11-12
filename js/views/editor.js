// Stock-count / order editor. Empty = not checked yet; 0 = checked, none. Auto-saves as draft after every change.
import { S, nm, catOf, unitOf, imgOf, runSearch, saveDoc, setStatus, siteOf, DOC_STATUS, lastCount, orderFromCount, deleteDoc, log, newItem, addSite } from '../store.js';
import { t } from '../i18n.js';
import { openModal as openModalU } from '../modal.js';
import { resizeImage as resizeImageU, blobToDataURL as blobToDataURLU } from '../util.js';
import { esc, debounce, num, fmtQty, fmtDateTime, toast, bidi } from '../util.js';
import { ic } from '../icons.js';
import { zoomImg, confirmDlg, menu, promptDlg } from '../modal.js';
import { editItem } from './itemEditor.js';
import { exportDialog } from './exportDialog.js';

export function render(root, { id }) {
  const doc = S.docs.find(d => d.id === id);
  if (!doc) { root.innerHTML = `<div class="page"><div class="empty"><p>${esc(t('not_found'))}</p><a class="btn primary" href="#/files">${esc(t('back'))}</a></div></div>`; return; }
  const isCount = doc.type === 'count';
  let q = '', cat = '', flt = 'all', saved = doc.updatedAt, progTxt = '';
  const he_ = S.cfg.lang === 'he', uiKey = 'sf_ui_' + doc.id;
  const prev = isCount ? null : lastCount(doc.site, doc.id);
  root.innerHTML = `<div class="page editor">
    <div class="stk">
    <div class="bar tight"><a class="icon-btn" href="#/${isCount ? 'counts' : 'orders'}" aria-label="${esc(t('back'))}">${ic('back', 22)}</a>
      <div class="ttl"><b id="ttl"></b><small id="sub"></small></div><span class="grow"></span><button class="btn sm" id="undoBtn" disabled><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/></svg> <span>${S.cfg.lang === 'he' ? 'בטל' : 'Undo'}</span></button><span class="st" id="stChip"></span></div>
    <div class="bar tight"><div class="searchbox">${ic('search', 18)}<input id="q" type="search" placeholder="${esc(t('search_ph'))}" autocomplete="off"><button class="icon-btn" id="qx" hidden>${ic('x', 16)}</button></div><button class="btn" id="newItemBtn" title="${he_ ? 'פריט חדש (שאינו בקטלוג)' : 'New item (not in catalog)'}">${ic('plus', 20)}</button><button class="btn" id="cartBtn" title="${S.cfg.lang === 'he' ? 'סל: רק מה שנוסף עד עכשיו' : 'Basket: only what was added so far'}">${ic('cart', 20)} <b id="cartN">0</b></button></div>
    <div class="pthin"><i id="pfill"></i></div></div>
    <details class="card meta" id="meta"><summary>${ic('sliders', 18)} ${esc(t('details'))}</summary><div class="metagrid">
      <label class="fld"><span>${esc(t('site'))}</span><select data-m="site">${S.sites.map(s => `<option value="${s.id}">${esc(nm(s, 'he'))}${s.en ? ' · ' + esc(s.en) : ''}</option>`).join('')}<option value="__new">${he_ ? '✎ אחר — כתיבה חופשית…' : '✎ Other — type…'}</option></select></label>
      <label class="fld"><span>${esc(t('date'))}</span><input type="date" data-m="date"></label>
      <label class="fld"><span>${esc(t('worker'))}</span><input data-m="worker"></label>
      <label class="fld"><span>${esc(t('status'))}</span><select data-m="status">${DOC_STATUS[doc.type].map(s => `<option value="${s}">${esc(t('st_' + s))}</option>`).join('')}</select></label>
      <label class="fld"><span>${esc(t('folder'))}</span><select data-m="folder"><option value="">${esc(t('no_folder'))}</option>${S.folders.map(f => `<option value="${f.id}">${esc(f.name)}</option>`).join('')}</select></label>
      <label class="fld wide"><span>${esc(t('note'))}</span><input data-m="note"></label></div></details>
    <div class="chips-row" id="fl"></div><div class="chips-row" id="cats"></div>
    <div id="list"></div>
    <div class="footbar slim"><button class="btn primary" id="saveBtn">${ic('check', 18)} <span>${he_ ? 'שמור וצא' : 'Save & exit'}</span></button>
      <button class="btn" id="exp">${ic('download', 18)} <span>${esc(t('export'))}</span></button></div></div>`;
  const $ = s => root.querySelector(s);
  // meta bindings
  $$('[data-m]').forEach(el => { el.value = doc[el.dataset.m] ?? ''; el.onchange = async () => { if (el.dataset.m === 'site' && el.value === '__new') { const n = await promptDlg(he_ ? 'שם האתר / המיקום' : 'Site / location name', ''); const id = n && await addSite(n); if (id) { el.insertAdjacentHTML('afterbegin', `<option value="${id}">${esc(n)}</option>`); el.value = id; } else { el.value = doc.site; return; } } doc[el.dataset.m] = el.value; if (el.dataset.m === 'status') await log('status', el.value, doc.id); await persist(); head(); }; });
  function $$(s) { return [...root.querySelectorAll(s)]; }
  const head = () => { $('#ttl').textContent = `${isCount ? t('count') : t('order')} · ${nm(siteOf(doc.site), 'he') || ''}`; $('#sub').textContent = `${doc.date}${doc.worker ? ' · ' + doc.worker : ''}${progTxt ? ' · ' + progTxt : ''}`; const c = $('#stChip'); c.className = 'st st-' + doc.status; c.textContent = t('st_' + doc.status); };
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
    progTxt = isCount ? t('counted_of', { n: s.n, t: s.tot }) : t('ordered_lines', { n: s.ord }); head();
  }
  function filters() {
    const s = stats(); { const cb = $('#cartBtn'); if (cb) cb.classList.toggle('primary', flt === 'added'); }
    $('#fl').innerHTML = isCount
      ? [['all', t('all')], ['uncounted', `${t('show_uncounted')} (${s.tot - s.n})`], ['counted', t('counted')], ['short', t('below_emergency')], ['img', S.cfg.lang === 'he' ? 'רק עם תמונה' : 'With image only'], ['sku', S.cfg.lang === 'he' ? 'רק עם מק"ט' : 'With SKU only'], ...hidPill()].map(([k, l]) => `<button class="pill ${flt === k ? 'on' : ''}" data-fl="${k}">${esc(l)}</button>`).join('')
      : [['all', t('all')], ['ordered', `${t('ordered')} (${s.ord})`], ['short', t('below_emergency')], ['img', S.cfg.lang === 'he' ? 'רק עם תמונה' : 'With image only'], ['sku', S.cfg.lang === 'he' ? 'רק עם מק"ט' : 'With SKU only'], ...hidPill()].map(([k, l]) => `<button class="pill ${flt === k ? 'on' : ''}" data-fl="${k}">${esc(l)}</button>`).join('');
    $('#cats').innerHTML = `<button class="pill ${!cat ? 'on' : ''}" data-c="">${esc(t('all_cats'))}</button>` + S.cats.map(c => `<button class="pill ${cat === c.id ? 'on' : ''}" data-c="${c.id}">${esc(nm(c))}</button>`).join('');
  }
  const passes = it => {
    if (cat && it.cat !== cat) return false; const v = doc.lines[it.id];
    if (flt === 'hidden') return !!doc.hidden?.[it.id]; if (doc.hidden?.[it.id]) return false;
    if (flt === 'added') return isCount ? v != null : v > 0;
    if (flt === 'img' && !imgOf(it)) return false; if (flt === 'sku' && !it.sku) return false;
    if (flt === 'uncounted') return v == null; if (flt === 'counted') return v != null; if (flt === 'ordered') return v > 0;
    if (flt === 'short') return it.emergency != null && (isCount ? (v != null && v < it.emergency) : (prev?.lines[it.id] ?? 0) < it.emergency);
    return true;
  };
  const noteRow = v => `<div class="rnote"><input data-note-in value="${esc(v)}" placeholder="${he_ ? 'הערה לפריט…' : 'Item note…'}" autocomplete="off"></div>`;
  function rowHtml(it) {
    const v = doc.lines[it.id], u = imgOf(it), pc = prev?.lines[it.id], sug = !isCount && it.emergency != null && pc != null && pc < it.emergency ? it.emergency - pc : null;
    const low = it.emergency != null && ((isCount && v != null && v < it.emergency)), note = doc.notes?.[it.id] || '';
    return `<div class="row ${v == null ? '' : v === 0 ? 'zero' : 'has'} ${low ? 'low' : ''}" data-id="${it.id}">
      <button class="thumb" data-zoom="${it.id}">${u ? `<img loading="lazy" src="${u}" alt="">` : ic('image', 24)}</button>
      <div class="info"><div class="n1">${bidi(nm(it))} <button class="rowed" data-edit type="button" aria-label="${he_ ? 'עריכת פריט' : 'Edit item'}">${ic('edit', 14)}</button></div>${it.sku ? `<div class="sku${String(it.sku).length > 11 ? ' long' : ''}">${esc(t('sku'))}: <span class="mono">${esc(it.sku)}</span></div>` : ''}<div class="n2">${S.cfg.lang === 'he' ? 'יחידת מידה' : 'Unit'}: <b>${esc(nm(unitOf(it.unit)))}</b>${!isCount && pc != null ? ` · ${esc(t('in_stock'))} ${fmtQty(pc)}` : ''}</div>${isCount && it.emergency != null ? `<div class="lowtag">${S.cfg.lang === 'he' ? 'מתחת למינימום' : 'Below minimum'} (${fmtQty(it.emergency)})</div>` : ''}
        ${sug ? `<button class="sug" data-sug="${sug}">${esc(t('fill_short', { n: fmtQty(sug) }))}</button>` : ''}${hideBtn(it)} <button class="btn sm lnkb" data-note type="button">${note ? (he_ ? 'ערוך הערה' : 'Edit note') : (he_ ? '+ הערה' : '+ Note')}</button>${isCount && it.cat === 'c_etools' ? ` <button class="btn sm lnkb" data-msd type="button">${he_ ? 'מס"דים' : 'MSD'}${(doc.units?.[it.id] || []).length ? ` (${doc.units[it.id].length})` : ''}</button>` : ''}</div>
      <div class="qty"><button data-dec aria-label="-">${ic('minus', 18)}</button><input inputmode="decimal" autocomplete="off" value="${v == null ? '' : fmtQty(v)}" placeholder="${isCount ? '—' : '0'}" aria-label="${esc(nm(it))}"><button data-inc aria-label="+">${ic('plus', 18)}</button>${isCount ? `<button class="clr" data-clr style="visibility:${v != null ? 'visible' : 'hidden'}" title="${esc(t('uncount'))}">${ic('x', 14)}</button>` : ''}</div>${note ? noteRow(note) : ''}</div>`;
  }
  // power tools: one row per physical tool (its own MSD number + photo). Stored ONLY inside this count (never in the catalog), and can be copied from the last count of the same site.
  function unitsDlg(id) {
    const it = S.byId.get(id); if (!it) return;
    let us = structuredClone(doc.units?.[id] || []), pickFor = -1;
    const prevU = lastCount(doc.site, doc.id)?.units?.[id] || [];
    const m = openModalU({ title: `${he_ ? 'מס\"דים' : 'MSD numbers'} · ${nm(it)}`, wide: true, content: '<div data-ul></div>',
      actions: `<button class="btn" data-no>${esc(t('cancel'))}</button><span class="grow"></span><button class="btn primary" data-ok>${esc(t('save'))}</button>` });
    const draw = () => {
      m.$('[data-ul]').innerHTML = `<p class="hint">${esc(he_ ? 'שורה לכל כלי: מספר המס"ד החרוט עליו ותמונה (אופציונלי). נשמר רק בספירה הזו ולא בקטלוג, כך שמחסנים ואתרים שונים לא מתערבבים.' : 'One row per tool: the MSD number engraved on it and an optional photo. Saved only in this count (not in the catalog), so different warehouses and sites never mix.')}</p>
        ${us.map((u, i) => `<div class="urow"><button class="uimg" type="button" data-img="${i}">${u.img ? `<img src="${u.img}" alt="">` : ic('image', 22)}</button><input data-n="${i}" dir="ltr" inputmode="numeric" placeholder="${esc(he_ ? 'מס"ד' : 'MSD no.')}" value="${esc(u.msd || '')}" autocomplete="off"><button class="icon-btn" type="button" data-rm="${i}">${ic('trash', 18)}</button></div>`).join('')}
        <div class="btnrow wrap"><button class="btn" type="button" data-add>${ic('plus', 16)} ${esc(he_ ? 'הוסף כלי' : 'Add tool')}</button>${prevU.length ? `<button class="btn" type="button" data-prev>${esc(he_ ? `העתק מהספירה האחרונה באתר זה (${prevU.length})` : `Copy from the last count at this site (${prevU.length})`)}</button>` : ''}</div>
        <input type="file" accept="image/*" hidden data-file>`;
      m.$$('[data-n]').forEach(x => x.oninput = () => { us[+x.dataset.n].msd = x.value; });
      m.$$('[data-rm]').forEach(b => b.onclick = () => { us.splice(+b.dataset.rm, 1); draw(); });
      m.$$('[data-img]').forEach(b => b.onclick = () => { pickFor = +b.dataset.img; m.$('[data-file]').click(); });
      m.$('[data-file]').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f || pickFor < 0 || !us[pickFor]) return; us[pickFor].img = await blobToDataURLU(await resizeImageU(f, 480)); draw(); };
      m.$('[data-add]').onclick = () => { us.push({ msd: '', img: '' }); draw(); setTimeout(() => m.$$('[data-n]').pop()?.focus(), 30); };
      const pv = m.$('[data-prev]'); if (pv) pv.onclick = () => { const have = new Set(us.map(u => u.msd)); prevU.forEach(u => { if (!u.msd || !have.has(u.msd)) us.push(structuredClone(u)); }); draw(); };
    };
    draw();
    m.$('[data-no]').onclick = () => m.close();
    m.$('[data-ok]').onclick = () => {
      us = us.filter(u => String(u.msd || '').trim() || u.img).map(u => ({ ...u, msd: String(u.msd || '').trim() }));
      if (us.length) (doc.units ||= {})[id] = us; else if (doc.units) { delete doc.units[id]; if (!Object.keys(doc.units).length) delete doc.units; }
      m.close(); persist(); draw0(); const row = root.querySelector(`.row[data-id="${id}"]`); if (row && us.length && (doc.lines[id] ?? 0) < us.length) setQty(row, us.length);
    };
  }
  const draw0 = () => draw();
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
  $('#list').addEventListener('input', e => { if (e.target.tagName !== 'INPUT') return; if (e.target.matches('[data-note-in]')) { const id = e.target.closest('.row').dataset.id, v = e.target.value; if (v.trim()) (doc.notes ||= {})[id] = v; else if (doc.notes) delete doc.notes[id]; autosave(); return; } const row = e.target.closest('.row'); if (typed !== row.dataset.id) { push({ id: row.dataset.id, v: doc.lines[row.dataset.id] }); typed = row.dataset.id; } const raw = e.target.value.replace(',', '.'); setQty(row, raw.trim() === '' ? null : (num(raw) != null && num(raw) >= 0 ? num(raw) : doc.lines[row.dataset.id] ?? null)); });
  $('#list').addEventListener('focusout', e => { if (e.target.tagName === 'INPUT' && !e.target.matches('[data-note-in]')) { const row = e.target.closest('.row'), v = doc.lines[row.dataset.id]; e.target.value = v == null ? '' : fmtQty(v); } });
  $('#list').addEventListener('focusin', e => { if (e.target.tagName === 'INPUT' && !e.target.matches('[data-note-in]')) { typed = null; e.target.select(); } });
  // keep the keyboard / focus while tapping +, -, etc. while the search box is active (no layout jumps)
  $('#list').addEventListener('mousedown', e => { if (document.activeElement === $('#q') && e.target.closest('button')) e.preventDefault(); });
  $('#list').addEventListener('click', e => {
    const row = e.target.closest('.row'); if (!row) return; const id = row.dataset.id, cur = doc.lines[id];
    if (e.target.closest('[data-inc],[data-dec],[data-clr],[data-sug]')) push({ id, v: cur });
    if (e.target.closest('[data-hide]')) push({ id, h: false }); if (e.target.closest('[data-unhide]')) push({ id, h: true });
    if (e.target.closest('[data-zoom]')) { const it = S.byId.get(id); zoomImg(imgOf(it), nm(it)); }
    else if (e.target.closest('[data-edit]')) { editItem(S.byId.get(id), { onDone: () => { filters(); draw(); progress(); } }); }
    else if (e.target.closest('[data-msd]')) unitsDlg(id);
    else if (e.target.closest('[data-note]')) { let ni = row.querySelector('[data-note-in]'); if (!ni) { row.insertAdjacentHTML('beforeend', noteRow('')); ni = row.querySelector('[data-note-in]'); } ni.focus(); }
    else if (e.target.closest('[data-inc]')) setQty(row, (cur ?? 0) + 1);
    else if (e.target.closest('[data-dec]')) setQty(row, Math.max(0, (cur ?? 1) - 1));
    else if (e.target.closest('[data-clr]')) setQty(row, null);
    else if (e.target.closest('[data-hide]')) { (doc.hidden ||= {})[id] = true; persist(); filters(); draw(); progress(); }
    else if (e.target.closest('[data-unhide]')) { delete doc.hidden[id]; if (!hidN()) flt = 'all'; persist(); filters(); draw(); progress(); }
    else if (e.target.closest('[data-sug]')) setQty(row, +e.target.closest('[data-sug]').dataset.sug);
  });
  $('#fl').onclick = e => { const b = e.target.closest('[data-fl]'); if (b) { flt = b.dataset.fl; filters(); draw(); saveUi(); } };
  $('#cats').onclick = e => { const b = e.target.closest('[data-c]'); if (b) { cat = b.dataset.c; filters(); draw(); saveUi(); } };
  $('#q').oninput = debounce(e => { q = e.target.value; $('#qx').hidden = !q; draw(); saveUi(); }, 120);
  $('#qx').onmousedown = e => e.preventDefault();   // clearing must not close the keyboard
  $('#qx').onclick = () => { $('#q').value = ''; q = ''; $('#qx').hidden = true; draw(); saveUi(); $('#q').focus(); };
  // new item that is not in the catalog yet (goes into the catalog and straight into this sheet)
  $('#newItemBtn').onclick = () => { const it = newItem(); it.he = q.trim(); editItem(it, { isNew: true, onDone: o => { if (!o) return; if (!isCount) doc.lines[o.id] = 1; q = o.he || o.en || ''; $('#q').value = q; $('#qx').hidden = !q; persist(); filters(); draw(); progress(); } }); };
  $('#undoBtn').onclick = undoLast;
  $('#cartBtn').onclick = () => { flt = flt === 'added' ? 'all' : 'added'; filters(); draw(); progress(); };
  $('#saveBtn').onclick = async () => { await persist(); toast(t('draft_saved')); location.hash = '#/' + (isCount ? 'counts' : 'orders'); };
  $('#exp').onclick = async () => { await persist(); exportDialog({ kind: 'doc', doc }); };
  const vis = () => { if (document.hidden) persist(); }; document.addEventListener('visibilitychange', vis);
  const saveUi = debounce(() => { try { localStorage.setItem(uiKey, JSON.stringify({ q, cat, flt, y: Math.round(scrollY) })); } catch (e) { /* ignore */ } }, 300);
  let restoreY = 0;
  try { const u = JSON.parse(localStorage.getItem(uiKey) || 'null'); if (u) { q = u.q || ''; cat = u.cat || ''; flt = u.flt || 'all'; if (flt === 'hidden' && !hidN()) flt = 'all'; restoreY = u.y || 0; $('#q').value = q; $('#qx').hidden = !q; } } catch (e) { /* ignore */ }
  window.addEventListener('scroll', saveUi, { passive: true });
  head(); filters(); progress(); draw(); if (restoreY) setTimeout(() => scrollTo(0, restoreY), 80);
  return () => { document.removeEventListener('visibilitychange', vis); window.removeEventListener('scroll', saveUi); persist(); };
}
