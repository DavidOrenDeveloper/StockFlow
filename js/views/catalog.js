import { S, nm, catOf, unitOf, imgOf, runSearch, newItem, bulkItems, deleteItem, saveList } from '../store.js';
import { t } from '../i18n.js';
import { esc, debounce, toast, bidi } from '../util.js';
import { ic } from '../icons.js';
import { zoomImg, confirmDlg, menu } from '../modal.js';
import { editItem } from './itemEditor.js';
import { exportDialog } from './exportDialog.js';

export function render(root) {
  let q = '', cat = '', sel = new Set(), selMode = false;
  const worker = () => false;   // old "worker mode" removed
  root.innerHTML = `<div class="page">
    <div class="bar sticky"><div class="searchbox">${ic('search', 18)}<input id="q" type="search" placeholder="${esc(t('search_ph'))}" autocomplete="off" enterkeyhint="search"><button class="icon-btn" id="qx" hidden>${ic('x', 16)}</button></div>
      <button class="btn" id="selBtn">${ic('check', 18)} <span>${esc(t('select'))}</span></button>
      ${worker() ? '' : `<button class="btn primary" id="addBtn">${ic('plus', 18)} <span>${esc(t('add_item'))}</span></button>`}</div>
    <div class="chips-row" id="cats"></div>
    <div class="meta-line" id="count"></div>
    <div id="list"></div>
    <div class="selbar" id="selbar" hidden></div></div>`;
  const $ = s => root.querySelector(s);
  const names2 = it => { const lg = S.cfg.lang; return ['he', 'en', 'tr'].filter(l => l !== lg).map(l => nm(it, l)).filter((v, i, a) => v && a.indexOf(v) === i && v !== nm(it)); };
  function card(it, badge = '') {
    const u = imgOf(it), on = sel.has(it.id);
    return `<div class="card item ${on ? 'sel' : ''}" data-id="${it.id}">
      <button class="thumb" data-zoom="${it.id}" aria-label="${esc(t('zoom'))}">${u ? `<img loading="lazy" src="${u}" alt="">` : ic('image', 26)}${u ? `<i>${ic('zoom', 14)}</i>` : ''}</button>
      <div class="info"><div class="n1">${bidi(nm(it))}</div>${names2(it).map(n => `<div class="n2">${esc(n)}</div>`).join('')}
        <div class="tags">${it.sku ? `<span class="tag mono">${esc(it.sku)}</span>` : `<span class="tag ghost">${esc(t('no_sku'))}</span>`}<span class="tag">${esc(nm(unitOf(it.unit)))}</span>${it.emergency != null ? `<span class="tag warn">${esc(t('emergency'))} ${it.emergency}</span>` : ''}${(it.msd || []).length ? `<span class="tag mono">${S.cfg.lang === 'he' ? 'מס״ד' : 'MSD'}: ${esc(it.msd.join(', '))}</span>` : ''}${badge}</div></div>
      ${selMode ? `<span class="checkmark">${on ? ic('check', 18) : ''}</span>` : (worker() ? '' : `<button class="icon-btn" data-edit="${it.id}" aria-label="${esc(t('edit'))}">${ic('edit', 18)}</button>`)}</div>`;
  }
  const badgeFor = r => r.by === 'sku' ? `<span class="tag b-sku">${esc(t('sku'))}</span>` : r.viaSyn || r.by === 'syn' ? `<span class="tag b-syn">${esc(t('synonym'))}</span>` : '';
  function draw() {
    const inCat = it => !cat || it.cat === cat;
    let html = '', total = 0;
    if (q.trim()) {
      const r = runSearch(q), ex = r.exact.filter(x => inCat(x.it)), ap = r.approx.filter(x => inCat(x.it)); total = ex.length + ap.length;
      if (ex.length) html += `<h3 class="grp">${esc(t('exact_matches'))} <b>${ex.length}</b></h3><div class="grid">${ex.map(x => card(x.it, badgeFor(x))).join('')}</div>`;
      if (ap.length) html += `<h3 class="grp soft">${esc(t('similar_matches'))} <b>${ap.length}</b></h3><div class="grid">${ap.map(x => card(x.it)).join('')}</div>`;
      if (!total) html = `<div class="empty">${ic('search', 36)}<p>${esc(t('no_results'))}</p></div>`;
    } else {
      for (const c of S.cats) {
        const its = S.items.filter(i => i.cat === c.id && inCat(i)); if (!its.length) continue; total += its.length;
        html += `<h3 class="grp">${esc(nm(c))} <b>${its.length}</b></h3><div class="grid">${its.map(i => card(i)).join('')}</div>`;
      }
      const orphan = S.items.filter(i => !S.cats.find(c => c.id === i.cat) && inCat(i)); total += orphan.length;
      if (orphan.length) html += `<h3 class="grp">?</h3><div class="grid">${orphan.map(i => card(i)).join('')}</div>`;
      if (!total) html = `<div class="empty">${ic('box', 36)}<p>${esc(t('empty_catalog'))}</p></div>`;
    }
    $('#list').innerHTML = html; $('#count').textContent = t('n_items', { n: total }) + (S.cfg.synOn ? '' : ' · ' + t('syn_off'));
    drawSel();
  }
  function drawCats() {
    $('#cats').innerHTML = `<button class="pill ${!cat ? 'on' : ''}" data-c="">${esc(t('all'))}</button>` + S.cats.map(c => `<button class="pill ${cat === c.id ? 'on' : ''}" data-c="${c.id}">${esc(nm(c))}</button>`).join('');
  }
  function drawSel() {
    const bar = $('#selbar'); bar.hidden = !selMode; root.classList.toggle('selecting', selMode);
    if (!selMode) return;
    bar.innerHTML = `<span class="selcount">${t('n_selected', { n: sel.size })}</span><button class="btn sm" data-s="all">${esc(t('select_all'))}</button>
      <button class="btn sm primary" data-s="export" ${sel.size ? '' : 'disabled'}>${ic('download', 16)} ${esc(t('export'))}</button>
      ${worker() ? '' : `<button class="btn sm" data-s="cat" ${sel.size ? '' : 'disabled'}>${esc(t('category'))}</button><button class="btn sm" data-s="unit" ${sel.size ? '' : 'disabled'}>${esc(t('unit'))}</button><button class="btn sm danger-o" data-s="del" ${sel.size ? '' : 'disabled'}>${ic('trash', 16)}</button>`}
      <button class="btn sm" data-s="end">${ic('x', 16)}</button>`;
  }
  const visibleIds = () => [...root.querySelectorAll('.card.item')].map(c => c.dataset.id);
  const setMode = on => { selMode = on; if (!on) sel.clear(); $('#selBtn span').textContent = on ? t('cancel') : t('select'); draw(); };
  $('#q').oninput = debounce(e => { q = e.target.value; $('#qx').hidden = !q; draw(); }, 120);
  $('#qx').onclick = () => { $('#q').value = ''; q = ''; $('#qx').hidden = true; draw(); $('#q').focus(); };
  $('#cats').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; cat = b.dataset.c; drawCats(); draw(); };
  $('#selBtn').onclick = () => setMode(!selMode);
  const addBtn = $('#addBtn'); if (addBtn) addBtn.onclick = () => editItem(newItem(), { isNew: true, onDone: () => { drawCats(); draw(); } });
  $('#list').onclick = e => {
    const z = e.target.closest('[data-zoom]'); if (z) { const it = S.byId.get(z.dataset.zoom); zoomImg(imgOf(it), nm(it)); return; }
    const ed = e.target.closest('[data-edit]'); if (ed) { editItem(S.byId.get(ed.dataset.edit), { onDone: draw }); return; }
    const c = e.target.closest('.card.item'); if (!c) return;
    if (selMode) { const id = c.dataset.id; sel.has(id) ? sel.delete(id) : sel.add(id); c.classList.toggle('sel'); c.querySelector('.checkmark').innerHTML = sel.has(id) ? ic('check', 18) : ''; drawSel(); }
    else if (!worker()) editItem(S.byId.get(c.dataset.id), { onDone: draw });
  };
  $('#selbar').onclick = async e => {
    const b = e.target.closest('[data-s]'); if (!b) return; const a = b.dataset.s, ids = [...sel];
    if (a === 'end') setMode(false);
    else if (a === 'all') { visibleIds().forEach(id => sel.add(id)); draw(); }
    else if (a === 'export') exportDialog({ kind: 'catalog', items: ids.map(i => S.byId.get(i)).filter(Boolean), name: 'selected_items' });
    else if (a === 'cat') menu(b, S.cats.map(c => ({ label: nm(c), onClick: async () => { await bulkItems(ids, { cat: c.id }); toast(t('saved')); drawCats(); draw(); } })));
    else if (a === 'unit') menu(b, S.units.map(u => ({ label: nm(u), onClick: async () => { await bulkItems(ids, { unit: u.id }); toast(t('saved')); draw(); } })));
    else if (a === 'del' && await confirmDlg(t('confirm_delete_n', { n: ids.length }), { danger: true, ok: t('delete') })) { for (const id of ids) await deleteItem(id); sel.clear(); toast(t('deleted')); draw(); }
  };
  drawCats(); draw();
}
