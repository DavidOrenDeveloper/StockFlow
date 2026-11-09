import { S, nm, setCfg, saveList, backupAll, restoreAll, log } from '../store.js';
import { t, setLang } from '../i18n.js';
import { esc, fmtDateTime, download, shareOrDownload, stamp, readFileText, toast, uid, safeName } from '../util.js';
import { ic } from '../icons.js';
import { openModal, confirmDlg, alertDlg } from '../modal.js';
import { APP_VERSION } from '../config.js';
import { checkForUpdate, resetAppCache, applyUpdate } from '../pwa.js';
import { importFiles, folderManager } from './docs.js';
import { exportDialog } from './exportDialog.js';
import { suggestEn, suggestTr } from '../lexicon.js';

const sw = (k, label, on, hint = '') => `<label class="switch"><input type="checkbox" data-sw="${k}" ${on ? 'checked' : ''}><i></i><span>${esc(label)}${hint ? `<small>${esc(hint)}</small>` : ''}</span></label>`;
export function render(root, { rerender }) {
  const c = S.cfg, worker = c.workerMode;
  root.innerHTML = `<div class="page narrow"><h1 class="ptitle">${esc(t('settings'))}</h1>
    <section class="card sec"><h2>${ic('globe', 20)} ${esc(t('display'))}</h2>
      <div class="seg3" id="lang">${[['he', 'עברית'], ['en', 'English'], ['tr', 'ABC']].map(([k, l]) => `<button class="${c.lang === k ? 'on' : ''}" data-l="${k}">${l}</button>`).join('')}</div>
      <p class="hint">${esc(t('lang_hint'))}</p>
      <label class="fld"><span>${esc(t('theme'))}</span><select data-sel="theme">${['auto', 'light', 'dark'].map(v => `<option value="${v}" ${c.theme === v ? 'selected' : ''}>${esc(t('theme_' + v))}</option>`).join('')}</select></label></section>
    <section class="card sec"><h2>${ic('edit', 20)} ${esc(t('me'))}</h2>
      <label class="fld"><span>${esc(t('worker_name'))}</span><input data-in="worker" value="${esc(c.worker)}" placeholder="${esc(t('worker_ph'))}"></label>
      ${sw('workerMode', t('worker_mode'), c.workerMode, t('worker_mode_hint'))}</section>
    <section class="card sec"><h2>${ic('search', 20)} ${esc(t('smart_search'))}</h2>
      ${sw('synOn', t('use_synonyms'), c.synOn, t('use_synonyms_hint'))}${sw('fuzzy', t('use_fuzzy'), c.fuzzy, t('use_fuzzy_hint'))}
      ${worker ? '' : `<div class="btnrow wrap"><button class="btn" id="syn">${ic('list', 18)} ${esc(t('manage_synonyms'))}</button></div>`}</section>
    ${worker ? '' : `<section class="card sec"><h2>${ic('sliders', 20)} ${esc(t('lists'))}</h2><div class="btnrow wrap">
      <button class="btn" data-list="cats">${esc(t('categories'))}</button><button class="btn" data-list="units">${esc(t('units'))}</button><button class="btn" data-list="sites">${esc(t('sites'))}</button><button class="btn" id="fld">${ic('folder', 16)} ${esc(t('folders'))}</button></div></section>`}
    <section class="card sec"><h2>${ic('download', 20)} ${esc(t('data'))}</h2>
      <p class="hint">${esc(t('last_backup'))}: <b>${c.lastBackup ? esc(fmtDateTime(c.lastBackup, c.lang)) : esc(t('never'))}</b></p>
      <div class="btnrow wrap"><button class="btn primary" id="bk">${ic('download', 18)} ${esc(t('backup_full'))}</button><button class="btn" id="bks">${ic('share', 18)} ${esc(t('backup_share'))}</button>${worker ? '' : `<button class="btn" id="rs">${ic('upload', 18)} ${esc(t('restore'))}</button>`}</div>
      <input type="file" id="rsf" accept=".json,application/json" hidden><input type="file" id="impf" accept=".json,application/json" multiple hidden>
      <p class="hint">${esc(t('backup_hint'))}</p>
      <div class="btnrow wrap"><button class="btn" id="expcat">${ic('table', 18)} ${esc(t('export_catalog'))}</button>${worker ? '' : `<button class="btn" id="imp">${ic('upload', 18)} ${esc(t('import_files'))}</button>`}<button class="btn" id="hist">${ic('history', 18)} ${esc(t('history'))}</button></div></section>
    <section class="card sec"><h2>${ic('refresh', 20)} ${esc(t('app'))}</h2>
      <p>${esc(t('version'))}: <b class="mono">${APP_VERSION}</b> <span id="updMsg" class="hint"></span></p>
      <div class="btnrow wrap"><button class="btn primary" id="upd">${ic('refresh', 18)} ${esc(t('check_update'))}</button><button class="btn" id="rc">${esc(t('reset_cache'))}</button></div>
      <p class="hint">${esc(t('update_safe'))}</p></section></div>`;
  const $ = s => root.querySelector(s);
  $('#lang').onclick = async e => { const b = e.target.closest('[data-l]'); if (b) { await setLang(b.dataset.l); } };
  root.querySelectorAll('[data-sw]').forEach(i => i.onchange = async () => { await setCfg({ [i.dataset.sw]: i.checked }); if (i.dataset.sw === 'workerMode') rerender(); });
  root.querySelector('[data-sel="theme"]').onchange = async e => { await setCfg({ theme: e.target.value }); document.documentElement.dataset.theme = e.target.value; };
  root.querySelector('[data-in="worker"]').onchange = e => setCfg({ worker: e.target.value.trim() });
  const syn = $('#syn'); if (syn) syn.onclick = synonymsManager;
  root.querySelectorAll('[data-list]').forEach(b => b.onclick = () => listEditor(b.dataset.list));
  const fl = $('#fld'); if (fl) fl.onclick = () => folderManager();
  const stamped = async () => { const b = await backupAll(); return new Blob([JSON.stringify(b)], { type: 'application/json' }); };
  $('#bk').onclick = async () => { download(await stamped(), `backup_${stamp()}.json`); await log('backup', 'download'); toast(t('downloaded')); rerender(); };
  $('#bks').onclick = async () => { await shareOrDownload(await stamped(), `backup_${stamp()}.json`, t('backup_full')); await log('backup', 'share'); rerender(); };
  const rs = $('#rs'); if (rs) { rs.onclick = () => $('#rsf').click(); $('#rsf').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    let b; try { b = JSON.parse(await readFileText(f)); if (b.kind !== 'backup') throw 0; } catch { return alertDlg(t('bad_file')); }
    const m = openModal({ title: t('restore'), content: `<p class="msg">${esc(t('restore_msg', { d: fmtDateTime(b.createdAt, S.cfg.lang), n: b.items.length, k: b.docs.length }))}</p>`,
      actions: `<button class="btn" data-a="x">${esc(t('cancel'))}</button><button class="btn" data-a="merge">${esc(t('restore_merge'))}</button><button class="btn danger" data-a="replace">${esc(t('restore_replace'))}</button>` });
    m.$$('[data-a]').forEach(bt => bt.onclick = async () => { const a = bt.dataset.a; if (a === 'x') return m.close(); if (a === 'replace' && !(await confirmDlg(t('restore_replace_confirm'), { danger: true, ok: t('restore_replace') }))) return; m.close(); try { await restoreAll(b, a); toast(t('restored')); rerender(); } catch (er) { alertDlg(t('bad_file')); } });
  }; }
  const imp = $('#imp'); if (imp) { imp.onclick = () => $('#impf').click(); $('#impf').onchange = e => { importFiles([...e.target.files]); e.target.value = ''; }; }
  $('#expcat').onclick = () => exportDialog({ kind: 'catalog', items: S.items, name: 'catalog' });
  $('#hist').onclick = historyView;
  $('#upd').onclick = async () => {
    const msg = $('#updMsg'); msg.textContent = t('checking'); const r = await checkForUpdate();
    msg.textContent = r.status === 'ready' ? t('update_ready') : r.status === 'latest' ? t('up_to_date') : r.status === 'offline' ? t('offline') : t('error');
    if (r.status === 'ready' && await confirmDlg(t('update_now_q'), { ok: t('update_now') })) applyUpdate();
  };
  $('#rc').onclick = async () => { if (await confirmDlg(t('reset_cache_q'), { ok: t('ok') })) { await resetAppCache(); location.reload(); } };
}
// ---- generic editable list (categories / units / sites): three names each ----
export function listEditor(kind) {
  const title = t(kind === 'cats' ? 'categories' : kind === 'units' ? 'units' : 'sites');
  const draw = () => {
    m.$('.mbody').innerHTML = `<p class="hint">${esc(t('list_hint'))}</p><div class="list3">${S[kind].map(x => `<div class="l3" data-id="${x.id}">
      <input data-k="he" dir="rtl" value="${esc(x.he)}" placeholder="עברית"><input data-k="en" dir="ltr" value="${esc(x.en || '')}" placeholder="English"><input data-k="tr" dir="ltr" value="${esc(x.tr || '')}" placeholder="ABC" style="text-transform:uppercase">
      <button class="icon-btn" data-wand title="${esc(t('suggest'))}">${ic('wand', 18)}</button><button class="icon-btn danger" data-rm>${ic('trash', 18)}</button></div>`).join('')}</div>
      <div class="btnrow"><button class="btn" data-add>${ic('plus', 16)} ${esc(t('add'))}</button></div>`;
    m.$$('.l3').forEach(r => {
      const x = S[kind].find(i => i.id === r.dataset.id);
      r.querySelectorAll('input').forEach(i => i.onchange = async () => { x[i.dataset.k] = i.value.trim(); await saveList(kind); });
      r.querySelector('[data-wand]').onclick = async () => { const he = r.querySelector('[data-k=he]').value; x.en = suggestEn(he); x.tr = suggestTr(he); await saveList(kind); draw(); };
      r.querySelector('[data-rm]').onclick = async () => { if (S[kind].length < 2) return; if (await confirmDlg(t('confirm_delete_list'), { danger: true, ok: t('delete') })) { S[kind] = S[kind].filter(i => i.id !== x.id); const fb = S[kind][0].id; if (kind === 'cats') S.items.forEach(i => { if (i.cat === x.id) i.cat = fb; }); if (kind === 'units') S.items.forEach(i => { if (i.unit === x.id) i.unit = fb; }); if (kind !== 'sites') { const { putMany } = await import('../db.js'); await putMany('items', S.items); } await saveList(kind); draw(); } };
    });
    m.$('[data-add]').onclick = async () => { S[kind].push({ id: uid(kind[0] + '_'), he: '', en: '', tr: '' }); await saveList(kind); draw(); m.$$('.l3').pop().querySelector('input').focus(); };
  };
  const m = openModal({ title, wide: true, content: '' }); draw();
}
// ---- global synonym groups ----
export function synonymsManager() {
  const draw = () => {
    m.$('.mbody').innerHTML = `<p class="hint">${esc(t('syn_hint'))}</p><div class="list">${S.groups.map(g => `<div class="lrow" data-id="${g.id}"><input class="grow" data-w value="${esc(g.words.join(', '))}"><button class="icon-btn danger" data-rm>${ic('trash', 18)}</button></div>`).join('')}</div><div class="btnrow"><button class="btn" data-add>${ic('plus', 16)} ${esc(t('add'))}</button></div>`;
    m.$$('.lrow').forEach(r => { const g = S.groups.find(x => x.id === r.dataset.id);
      r.querySelector('[data-w]').onchange = async e => { g.words = e.target.value.split(/[,،;]/).map(s => s.trim()).filter(Boolean); await saveList('groups'); };
      r.querySelector('[data-rm]').onclick = async () => { S.groups = S.groups.filter(x => x.id !== g.id); await saveList('groups'); draw(); }; });
    m.$('[data-add]').onclick = async () => { S.groups.push({ id: uid('g'), words: [] }); await saveList('groups'); draw(); m.$$('[data-w]').pop().focus(); };
  };
  const m = openModal({ title: t('manage_synonyms'), wide: true, content: '' }); draw();
}
function historyView() {
  const icon = { 'item+': '＋', 'item~': '✎', 'item-': '✕' };
  openModal({ title: t('history'), wide: true, content: `<div class="list">${S.log.slice(0, 200).map(l => `<div class="lrow"><span class="mono small">${esc(fmtDateTime(l.ts, S.cfg.lang))}</span><span class="grow"><b>${esc(l.action)}</b> ${esc(l.text || '')}</span>${l.by ? `<small>${esc(l.by)}</small>` : ''}</div>`).join('') || `<p class="hint">${esc(t('none'))}</p>`}</div>` });
}
