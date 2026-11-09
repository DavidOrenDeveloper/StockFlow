// List of counts / orders / all files (with folders, worker grouping, import of worker JSON files)
import { S, nm, siteOf, newDoc, saveDoc, deleteDoc, importDocEnvelope, DOC_STATUS, saveList, log } from '../store.js';
import { t } from '../i18n.js';
import { esc, fmtDate, fmtQty, readFileText, toast, uid } from '../util.js';
import { ic } from '../icons.js';
import { openModal, confirmDlg, menu, promptDlg } from '../modal.js';
import { exportDialog } from './exportDialog.js';

const prog = d => {
  const n = Object.keys(d.lines).length;
  if (d.type === 'count') return `${n}/${S.items.length}`;
  const tot = Object.values(d.lines).reduce((a, b) => a + (b > 0 ? 1 : 0), 0); return t('n_lines', { n: tot });
};
export function createDocDialog(type, onCreate) {
  const m = openModal({
    title: type === 'count' ? t('new_count') : t('new_order'),
    content: `<label class="fld"><span>${esc(t('site'))}</span><select data-k="site">${S.sites.map(s => `<option value="${s.id}" ${s.id === S.cfg.lastSite ? 'selected' : ''}>${esc(nm(s, 'he'))}${s.en ? ' · ' + esc(s.en) : ''}</option>`).join('')}</select></label>
      <label class="fld"><span>${esc(t('worker'))}</span><input data-k="worker" value="${esc(S.cfg.worker)}" placeholder="${esc(t('worker_ph'))}"></label>
      <label class="fld"><span>${esc(t('note'))}</span><input data-k="note"></label>`,
    actions: `<button class="btn" data-no>${esc(t('cancel'))}</button><button class="btn primary" data-go>${esc(t('create'))}</button>`
  });
  m.$('[data-no]').onclick = () => m.close();
  m.$('[data-go]').onclick = async () => {
    const d = newDoc(type), k = n => m.$(`[data-k="${n}"]`).value.trim();
    d.site = k('site'); d.worker = k('worker'); d.note = k('note');
    if (d.worker && d.worker !== S.cfg.worker) S.cfg.worker = d.worker;
    await saveDoc(d); await log('doc+', `${type} ${d.date}`, d.id); m.close(); onCreate(d);
  };
}
export async function importFiles(files, after) {
  let ok = 0;
  for (const f of files) {
    try {
      const env = JSON.parse(await readFileText(f));
      const d = await importDocEnvelope(env, { onConflict: (ex, inc) => new Promise(res => {
        const m = openModal({ title: t('import_conflict'), content: `<p class="msg">${esc(t('import_conflict_msg', { w: ex.worker || '-', d: fmtDate(ex.date, S.cfg.lang) }))}</p>`,
          actions: `<button class="btn" data-a="skip">${esc(t('skip'))}</button><button class="btn" data-a="copy">${esc(t('keep_both'))}</button><button class="btn primary" data-a="replace">${esc(t('replace'))}</button>`, onClose: () => res('skip') });
        m.$$('[data-a]').forEach(b => b.onclick = () => { res(b.dataset.a); m.close(); });
      }) });
      if (d) ok++;
    } catch (e) { toast(`${f.name}: ${t('bad_file')}`, 4000); }
  }
  if (ok) toast(t('imported_n', { n: ok })); after && after();
}
export function render(root, { type = 'all' } = {}) {
  const f = { status: '', worker: '', site: '', group: type === 'all' ? 'folder' : 'worker', q: '' };
  root.innerHTML = `<div class="page"><div class="bar sticky">
      <h1 class="ptitle">${esc(type === 'count' ? t('counts') : type === 'order' ? t('orders') : t('files'))}</h1><span class="grow"></span>
      <button class="btn" id="imp">${ic('upload', 18)} <span>${esc(t('import_files'))}</span></button>
      ${type === 'all' ? `<button class="btn" id="fld">${ic('folder', 18)}</button>` : ''}
      ${type === 'all' ? `<button class="btn primary" id="nc">${ic('clipboard', 18)} <span>${esc(t('new_count'))}</span></button><button class="btn primary" id="no">${ic('cart', 18)} <span>${esc(t('new_order'))}</span></button>`
        : `<button class="btn primary" id="new">${ic('plus', 18)} <span>${esc(type === 'count' ? t('new_count') : t('new_order'))}</span></button>`}
      <input type="file" id="file" accept=".json,application/json" multiple hidden></div>
    <div class="filters" id="filters"></div><div id="list"></div></div>`;
  const $ = s => root.querySelector(s);
  const docs = () => S.docs.filter(d => (type === 'all' || d.type === type) && (!f.status || d.status === f.status) && (!f.worker || (d.worker || '') === f.worker) && (!f.site || d.site === f.site) &&
    (!f.q || [d.worker, d.note, nm(siteOf(d.site), 'he')].join(' ').toLowerCase().includes(f.q.toLowerCase()))).sort((a, b) => (b.date + b.updatedAt).localeCompare(a.date + a.updatedAt));
  const sel = (k, label, opts) => `<label class="sel"><span>${esc(label)}</span><select data-f="${k}"><option value="">${esc(t('all'))}</option>${opts.map(o => `<option value="${esc(o[0])}" ${f[k] === o[0] ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select></label>`;
  function drawFilters() {
    const workers = [...new Set(S.docs.map(d => d.worker || ''))].filter(Boolean).sort();
    const sts = [...new Set(Object.values(DOC_STATUS).flat())];
    $('#filters').innerHTML = `<div class="searchbox sm">${ic('search', 16)}<input data-f="q" value="${esc(f.q)}" placeholder="${esc(t('filter_ph'))}"></div>
      ${sel('status', t('status'), sts.map(s => [s, t('st_' + s)]))}${sel('worker', t('worker'), workers.map(w => [w, w]))}${sel('site', t('site'), S.sites.map(s => [s.id, nm(s, 'he')]))}
      <label class="sel"><span>${esc(t('group_by'))}</span><select data-f="group">${['folder', 'worker', 'site', 'status', 'month', 'none'].map(g => `<option value="${g}" ${f.group === g ? 'selected' : ''}>${esc(t('g_' + g))}</option>`).join('')}</select></label>`;
  }
  const keyOf = d => f.group === 'folder' ? (S.folders.find(x => x.id === d.folder)?.name || t('no_folder')) : f.group === 'worker' ? (d.worker || t('no_worker')) : f.group === 'site' ? nm(siteOf(d.site), 'he') : f.group === 'status' ? t('st_' + d.status) : f.group === 'month' ? d.date.slice(0, 7) : '';
  function row(d) {
    return `<div class="card doc" data-id="${d.id}"><span class="dicon ${d.type}">${ic(d.type === 'count' ? 'clipboard' : 'cart', 22)}</span>
      <div class="info"><div class="n1">${esc(nm(siteOf(d.site), 'he') || '—')} · ${esc(fmtDate(d.date, S.cfg.lang))}</div>
      <div class="n2">${esc(d.worker || t('no_worker'))}${d.note ? ' · ' + esc(d.note) : ''}</div>
      <div class="tags"><span class="st st-${d.status}">${esc(t('st_' + d.status))}</span><span class="tag">${esc(d.type === 'count' ? t('count') : t('order'))}</span><span class="tag">${esc(prog(d))}</span>${d.imported ? `<span class="tag b-syn">${esc(t('imported'))}</span>` : ''}</div></div>
      <button class="icon-btn" data-more="${d.id}">${ic('more', 20)}</button></div>`;
  }
  function draw() {
    const list = docs();
    if (!list.length) { $('#list').innerHTML = `<div class="empty">${ic('folder', 40)}<p>${esc(t('no_docs'))}</p></div>`; return; }
    const groups = new Map(); list.forEach(d => { const k = keyOf(d); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(d); });
    $('#list').innerHTML = [...groups].map(([k, ds]) => `${k ? `<h3 class="grp">${ic('folder', 16)} ${esc(k)} <b>${ds.length}</b></h3>` : ''}<div class="grid wide">${ds.map(row).join('')}</div>`).join('');
  }
  $('#filters').addEventListener('input', e => { const k = e.target.dataset.f; if (!k) return; f[k] = e.target.value; if (k !== 'q') drawFilters(); draw(); if (k === 'q') return; });
  $('#filters').addEventListener('change', e => { const k = e.target.dataset.f; if (k && k !== 'q') { f[k] = e.target.value; draw(); } });
  const go = d => { location.hash = '#/doc/' + d.id; };
  const mk = tp => () => createDocDialog(tp, go);
  if (type === 'all') { $('#nc').onclick = mk('count'); $('#no').onclick = mk('order'); $('#fld').onclick = folderManager; } else $('#new').onclick = mk(type);
  $('#imp').onclick = () => $('#file').click();
  $('#file').onchange = e => { importFiles([...e.target.files], () => { drawFilters(); draw(); }); e.target.value = ''; };
  $('#list').onclick = e => {
    const mo = e.target.closest('[data-more]');
    if (mo) { const d = S.docs.find(x => x.id === mo.dataset.more); menu(mo, [
      { label: t('open'), icon: 'eye', onClick: () => go(d) }, { label: t('export'), icon: 'download', onClick: () => exportDialog({ kind: 'doc', doc: d }) },
      { label: t('move_folder'), icon: 'folder', onClick: () => moveFolder(d) }, { label: t('duplicate'), icon: 'copy', onClick: async () => { const c = structuredClone(d); c.id = uid('d'); c.status = 'draft'; c.imported = null; c.exportedAt = null; await saveDoc(c); draw(); toast(t('saved')); } },
      { label: t('delete'), icon: 'trash', danger: true, onClick: async () => { if (await confirmDlg(t('confirm_delete_doc'), { danger: true, ok: t('delete') })) { await deleteDoc(d.id); drawFilters(); draw(); } } }]); return; }
    const c = e.target.closest('.card.doc'); if (c) location.hash = '#/doc/' + c.dataset.id;
  };
  function moveFolder(d) {
    const m = openModal({ title: t('move_folder'), content: `<div class="list">${[{ id: '', name: t('no_folder') }, ...S.folders].map(fl => `<button class="btn block ${d.folder === fl.id ? 'primary' : ''}" data-f="${fl.id}">${ic('folder', 16)} ${esc(fl.name)}</button>`).join('')}</div>` });
    m.$$('[data-f]').forEach(b => b.onclick = async () => { d.folder = b.dataset.f; await saveDoc(d); m.close(); draw(); });
  }
  drawFilters(); draw();
}
export function folderManager(onDone) {
  const draw = () => {
    m.$('.mbody').innerHTML = `<p class="hint">${esc(t('folders_hint'))}</p><div class="list">${S.folders.map(f => `<div class="lrow"><span class="grow">${ic('folder', 16)} ${esc(f.name)} <small>(${esc(f.type === 'count' ? t('count') : f.type === 'order' ? t('order') : t('all'))})</small></span><button class="icon-btn" data-ed="${f.id}">${ic('edit', 18)}</button><button class="icon-btn danger" data-rm="${f.id}">${ic('trash', 18)}</button></div>`).join('')}</div>
      <div class="btnrow wrap"><button class="btn" data-add="count">${ic('plus', 16)} ${esc(t('count'))}</button><button class="btn" data-add="order">${ic('plus', 16)} ${esc(t('order'))}</button><button class="btn" data-add="any">${ic('plus', 16)} ${esc(t('all'))}</button></div>`;
    m.$$('[data-add]').forEach(b => b.onclick = async () => { const n = await promptDlg(t('folder_name'), ''); if (n) { S.folders.push({ id: uid('f'), name: n, type: b.dataset.add }); await saveList('folders'); draw(); } });
    m.$$('[data-ed]').forEach(b => b.onclick = async () => { const f = S.folders.find(x => x.id === b.dataset.ed), n = await promptDlg(t('folder_name'), f.name); if (n) { f.name = n; await saveList('folders'); draw(); } });
    m.$$('[data-rm]').forEach(b => b.onclick = async () => { if (await confirmDlg(t('confirm_delete_folder'), { danger: true, ok: t('delete') })) { const id = b.dataset.rm; S.folders = S.folders.filter(x => x.id !== id); for (const d of S.docs.filter(d => d.folder === id)) { d.folder = ''; await saveDoc(d, { quiet: true }); } await saveList('folders'); draw(); } });
  };
  const m = openModal({ title: t('folders'), content: '', onClose: () => onDone && onDone() }); draw();
}
