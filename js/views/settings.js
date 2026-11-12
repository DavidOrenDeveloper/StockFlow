import { S, nm, setCfg, saveList, pendingUpdates, exportUpdatesBlob, markUpdatesSent, backupAll, restoreAll, log, exportCatalogBlob, importCatalog, restoreDefaultCatalog } from '../store.js';
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
const MANAGER_EMAIL = 'davido@shapir.co.il';
const LL = (he, en) => (S.cfg.lang === 'he' ? he : en);
const helpItems = () => [
  ['bk', LL('גיבוי מלא', 'Full backup'), LL('שומר את כל מה שיש באפליקציה בקובץ אחד: הקטלוג עם התמונות, הספירות, ההזמנות, ההגדרות וההיסטוריה. "הורדה" שומרת את הקובץ במכשיר. "שליחה" פותחת את תפריט השיתוף (וואטסאפ, מייל ועוד). מומלץ לפני עדכון גדול או החלפת מכשיר.', 'Saves everything in the app into one file: the catalog with photos, counts, orders, settings and history. "Download" saves the file on the device. "Send" opens the share menu (WhatsApp, email and more). Recommended before a big update or when changing devices.')],
  ['rs', LL('שחזור מגיבוי', 'Restore from backup'), LL('טוען קובץ גיבוי חזרה. "החלפה" מוחקת את כל הנתונים הקיימים ומחליפה אותם במה שבקובץ. "מיזוג" מוסיף רק מה שחסר ולא מוחק כלום; על פריטים ומסמכים שקיימים בשני המקומות תבחר: להשאיר את העדכני יותר, להשאיר את שלי, או להחליף בגרסת הקובץ.', 'Loads a backup file back. "Replace" deletes all current data and replaces it with the file. "Merge" only adds what is missing and deletes nothing; for items and documents that exist in both places you choose: keep the newer, keep mine, or take the file\'s version.')],
  ['cs', LL('שלח קטלוג (קובץ)', 'Send catalog (file)'), LL('שולח את כל הקטלוג בקובץ אחד: פריטים, תמונות, שמות, מק"טים, יחידות וקטגוריות. בלי ספירות והזמנות. מתאים להעברת הקטלוג למכשיר אחר.', 'Sends the whole catalog as one file: items, photos, names, SKUs, units and categories. No counts or orders. Good for moving the catalog to another device.')],
  ['cg', LL('קבל קטלוג מקובץ', 'Load catalog from file'), LL('טוען קובץ קטלוג שקיבלת. הקטלוג הנוכחי מוחלף בו. ספירות והזמנות לא נפגעות.', 'Loads a catalog file you received. The current catalog is replaced by it. Counts and orders are not affected.')],
  ['cr', LL('שחזור קטלוג לברירת מחדל', 'Restore default catalog'), LL('מוחק את כל מה שהוספת או שינית בקטלוג (פריטים, תמונות, שמות, מק"טים) וחוזר לקטלוג המקורי של האפליקציה. ספירות והזמנות נשארות. אי אפשר לבטל.', 'Deletes everything you added or changed in the catalog (items, photos, names, SKUs) and goes back to the app\'s original catalog. Counts and orders stay. Cannot be undone.')],
  ['ec', LL('ייצוא הקטלוג', 'Export catalog'), LL('יוצר רשימת פריטים לקריאה והדפסה (אקסל, PDF או תמונות). זו רשימה לעיון בלבד, לא קובץ שאפשר לטעון חזרה לאפליקציה.', 'Creates an item list for reading and printing (Excel, PDF or pictures). It is for viewing only, not a file you can load back into the app.')],
  ['im', LL('ייבוא קבצים', 'Import files'), LL('פותח קבצי ספירת מלאי והזמנה שנשלחו אליך מאפליקציה אחרת (מהכפתור של שליחת קובץ ספירה או הזמנה), כדי שתראה אותם אצלך.', 'Opens stock-count and order files that were sent to you from another copy of the app (from the "send count/order file" button) so you can see them on your device.')],
  ['hi', LL('היסטוריה', 'History'), LL('יומן של הפעולות האחרונות באפליקציה: הוספה ועריכה של פריטים, גיבויים, שליחות ועוד.', 'A log of recent actions in the app: adding and editing items, backups, sends and more.')],
  ['up', LL('שלח עדכוני קטלוג למנהל', 'Send catalog updates to manager'), LL('שולח למנהל רק את הפריטים והתמונות שהוספת או שינית מאז השליחה האחרונה, כדי שיוסיף אותם לקטלוג של כולם. הלחיצה על סימן השאלה לידו מסבירה שלב אחר שלב איך שולחים.', 'Sends the manager only the items and photos you added or changed since the last send, so they can be added to everyone\'s catalog. The question mark next to it explains step by step how to send.')],
  ['rc', LL('ניקוי מטמון האפליקציה', 'Clear app cache'), LL('מוחק רק את קבצי האפליקציה ששמורים כדי שתעבוד בלי אינטרנט, וטוען אותם מחדש. הספירות, ההזמנות, הקטלוג, התמונות וההגדרות שלך לא נמחקים, כי הם נשמרים במקום אחר. כדאי להשתמש בו כשהאפליקציה "תקועה" על גרסה ישנה, ורק כשיש אינטרנט.', 'Deletes only the app files stored so it can work offline, and loads them again. Your counts, orders, catalog, photos and settings are NOT deleted, they are stored elsewhere. Use it when the app seems stuck on an old version, and only while online.')],
];
function updatesHelp() {
  const m = openModal({ title: LL('איך שולחים עדכוני קטלוג למנהל', 'How to send catalog updates to the manager'), wide: true,
    content: `<ol style="line-height:1.7;padding-inline-start:20px"><li>${esc(LL('לוחצים על "שלח עדכוני קטלוג למנהל".', 'Tap "Send catalog updates to manager".'))}</li>
      <li>${esc(LL('בטלפון נפתח תפריט השיתוף. בוחרים אפליקציה: Gmail או Outlook (נפתח מייל חדש והקובץ כבר מצורף), וואטסאפ, או כל אפליקציה אחרת.', 'On a phone the share menu opens. Choose an app: Gmail or Outlook (a new email opens with the file already attached), WhatsApp, or any other app.'))}</li>
      <li>${esc(LL('במייל: מדביקים בשדה "אל" את הכתובת שלמטה ושולחים.', 'In email: paste the address below into the "To" field and send.'))}</li>
      <li>${esc(LL('במחשב אין תפריט שיתוף: הקובץ יורד למחשב ויש לצרף אותו ידנית להודעה.', 'A computer has no share menu: the file is downloaded and you attach it to your message manually.'))}</li></ol>
    <div class="mail"><b>${MANAGER_EMAIL}</b><button class="btn sm" data-copy>${esc(LL('העתק כתובת', 'Copy address'))}</button></div>
    <p class="hint">${esc(LL('נשלחים רק פריטים ותמונות שהוספת או שינית מאז השליחה האחרונה. אחרי השליחה המונה מתאפס, וכל שליחה נשמרת ב"יומן שליחות" כדי שאפשר יהיה לשלוח אותה שוב או למישהו אחר.', 'Only items and photos you added or changed since the last send are included. After sending, the counter resets and every send is kept in the "Send log" so it can be sent again or to someone else.'))}</p>`,
    actions: `<span class="grow"></span><button class="btn primary" data-ok>${esc(LL('סגור', 'Close'))}</button>` });
  m.$('[data-ok]').onclick = () => m.close();
  m.$('[data-copy]').onclick = async () => { try { await navigator.clipboard.writeText(MANAGER_EMAIL); toast(LL('הכתובת הועתקה', 'Address copied')); } catch { toast(MANAGER_EMAIL); } };
}
export function render(root, { rerender }) {
  const c = S.cfg, worker = false;   // the old "worker mode" was removed
  root.innerHTML = `<div class="page narrow"><h1 class="ptitle">${esc(t('settings'))}</h1>
    <section class="card sec"><h2>${ic('globe', 20)} ${esc(t('display'))}</h2>
      <div class="seg3" id="lang">${[['he', 'עברית'], ['en', 'English'], ['tr', 'ABC']].map(([k, l]) => `<button class="${c.lang === k ? 'on' : ''}" data-l="${k}">${l}</button>`).join('')}</div>
      <p class="hint">${esc(t('lang_hint'))}</p>
      <label class="fld"><span>${esc(t('theme'))}</span><select data-sel="theme">${['auto', 'light', 'dark'].map(v => `<option value="${v}" ${c.theme === v ? 'selected' : ''}>${esc(t('theme_' + v))}</option>`).join('')}</select></label></section>
    <section class="card sec"><h2>${ic('edit', 20)} ${esc(t('me'))}</h2>
      <label class="fld"><span>${esc(t('worker_name'))}</span><input data-in="worker" value="${esc(c.worker)}" placeholder="${esc(t('worker_ph'))}"></label></section>
    <section class="card sec"><h2>${ic('search', 20)} ${esc(t('smart_search'))}</h2>
      ${sw('synOn', t('use_synonyms'), c.synOn, t('use_synonyms_hint'))}${sw('fuzzy', t('use_fuzzy'), c.fuzzy, t('use_fuzzy_hint'))}
      ${worker ? '' : `<div class="btnrow wrap"><button class="btn" id="syn">${ic('list', 18)} ${esc(t('manage_synonyms'))}</button></div>`}</section>
    ${worker ? '' : `<section class="card sec"><h2>${ic('sliders', 20)} ${esc(t('lists'))}</h2><div class="btnrow wrap">
      <button class="btn" data-list="cats">${esc(t('categories'))}</button><button class="btn" data-list="units">${esc(t('units'))}</button><button class="btn" data-list="sites">${esc(t('sites'))}</button><button class="btn" id="fld">${ic('folder', 16)} ${esc(t('folders'))}</button><button class="btn" id="clrEm">${c.lang === 'he' ? 'איפוס כל המינימום' : 'Reset all minimums'}</button></div></section>`}
    <section class="card sec"><h2>${ic('download', 20)} ${esc(t('data'))} <button class="qmark" id="helpBtn" type="button" aria-label="${esc(LL('עזרה', 'Help'))}">?</button></h2>
      <div id="helpBox" hidden><p class="hint">${esc(LL('לחיצה על כפתור פותחת הסבר מפורט, ולחיצה נוספת סוגרת.', 'Tap a button to open its detailed explanation, tap again to close.'))}</p>${helpItems().map(([k, label, txt]) => `<button class="btn hbtn" type="button" data-h="${k}"><span>${esc(label)}</span><span>▾</span></button><div class="hbody" hidden>${esc(txt)}</div>`).join('')}</div>
      <p class="hint">${esc(t('last_backup'))}: <b>${c.lastBackup ? esc(fmtDateTime(c.lastBackup, c.lang)) : esc(t('never'))}</b></p>
      <div class="btnrow wrap"><button class="btn" id="bkMenu" type="button">${ic('download', 18)} ${esc(LL('גיבוי מלא', 'Full backup'))} ▾</button><button class="btn" id="rs" type="button">${ic('upload', 18)} ${esc(t('restore'))}</button></div>
      <div class="btnrow wrap" id="bkSub" hidden style="margin-top:6px"><button class="btn" id="bk" type="button">${ic('download', 16)} ${esc(LL('הורדה', 'Download'))}</button><button class="btn" id="bks" type="button">${ic('share', 16)} ${esc(LL('שליחה', 'Send'))}</button></div>
      <input type="file" id="rsf" accept=".json,application/json,.txt,text/plain" hidden><input type="file" id="impf" accept=".json,application/json,.txt,text/plain" multiple hidden>
      <div class="btnrow wrap" style="margin-top:10px"><button class="btn" id="catSend">${esc(LL('שלח קטלוג (קובץ)', 'Send catalog (file)'))}</button><button class="btn" id="catGet">${esc(LL('קבל קטלוג מקובץ', 'Load catalog from file'))}</button><button class="btn danger" id="catReset">${esc(LL('שחזור קטלוג לברירת מחדל', 'Restore default catalog'))}</button></div>
      <p class="hint">${esc(LL('הקטלוג הוא כל הפריטים כולל התמונות שלהם. ספירות והזמנות לא נשלחות ולא נמחקות.', 'The catalog is all items including their photos. Counts and orders are never sent or deleted.'))}</p>
      <div class="btnrow wrap"><button class="btn" id="expcat">${ic('table', 18)} ${esc(t('export_catalog'))}</button><button class="btn" id="imp">${ic('upload', 18)} ${esc(t('import_files'))}</button><button class="btn" id="hist">${ic('history', 18)} ${esc(t('history'))}</button></div>
      <div class="updbox"><p class="hint">${esc(LL(`הוספת או תיקנת פריטים ותמונות? שלח אותם למנהל: ${pendingUpdates().length} פריטים מחכים לשליחה.`, `Added or fixed items and photos? Send them to the manager: ${pendingUpdates().length} items waiting.`))}</p>
        <div class="btnrow wrap"><button class="btn" id="updSend" type="button">${ic('share', 18)} ${esc(LL('שלח עדכוני קטלוג למנהל', 'Send catalog updates to manager'))}</button><button class="qmark" id="updHelp" type="button" aria-label="${esc(LL('הסבר', 'Explain'))}">?</button><button class="btn" id="updLog" type="button">${ic('history', 18)} ${esc(LL('יומן שליחות', 'Send log'))}</button></div></div></section>
    <section class="card sec"><h2>${ic('refresh', 20)} ${esc(t('app'))}</h2>
      <p>${esc(t('version'))}: <b class="mono">${APP_VERSION}</b> <span id="updMsg" class="hint"></span></p>
      <div class="btnrow wrap"><button class="btn primary" id="upd">${ic('refresh', 18)} ${esc(t('check_update'))}</button><button class="btn" id="rc">${esc(t('reset_cache'))}</button><button class="btn" id="instApp">${ic('download', 18)} ${esc(c.lang === 'he' ? 'התקן כאפליקציה' : 'Install as app')}</button></div>
      <p class="hint">${esc(t('update_safe'))}</p></section></div>`;
  const $ = s => root.querySelector(s);
  $('#lang').onclick = async e => { const b = e.target.closest('[data-l]'); if (b) { await setLang(b.dataset.l); } };
  root.querySelectorAll('[data-sw]').forEach(i => i.onchange = async () => { await setCfg({ [i.dataset.sw]: i.checked }); if (i.dataset.sw === 'workerMode') rerender(); });
  root.querySelector('[data-sel="theme"]').onchange = async e => { await setCfg({ theme: e.target.value }); document.documentElement.dataset.theme = e.target.value; };
  root.querySelector('[data-in="worker"]').onchange = e => setCfg({ worker: e.target.value.trim() });
  const syn = $('#syn'); if (syn) syn.onclick = synonymsManager;
  root.querySelectorAll('[data-list]').forEach(b => b.onclick = () => listEditor(b.dataset.list));
  const fl = $('#fld'); if (fl) fl.onclick = () => folderManager();
  const em = $('#clrEm'); if (em) em.onclick = async () => {
    const he = S.cfg.lang === 'he', n = S.items.filter(i => i.emergency != null).length;
    if (!n) return toast(he ? 'אין ערכי מינימום להסרה' : 'No minimums set');
    if (!(await confirmDlg(he ? `לאפס את המינימום של ${n} פריטים? אפשר להזין אותו מחדש בכל פריט בנפרד.` : `Reset the minimum of ${n} items? You can set it again per item.`, { danger: true, ok: he ? 'אפס' : 'Reset' }))) return;
    const now = new Date().toISOString(); S.items.forEach(i => { if (i.emergency != null) { i.emergency = null; i.updatedAt = now; } });
    const { putMany } = await import('../db.js'); await putMany('items', S.items); await log('item~', 'reset minimums'); toast(he ? 'המינימום אופס' : 'Minimums reset');
  };
  const stamped = async () => { const b = await backupAll(); return new Blob([JSON.stringify(b)], { type: 'application/json' }); };
  $('#helpBtn').onclick = () => { const b = $('#helpBox'); b.hidden = !b.hidden; };
  $('#helpBox').onclick = e => { const h = e.target.closest('[data-h]'); if (!h) return; const body = h.nextElementSibling; body.hidden = !body.hidden; h.lastElementChild.textContent = body.hidden ? '▾' : '▴'; };
  $('#bkMenu').onclick = () => { $('#bkSub').hidden = !$('#bkSub').hidden; };
  $('#updHelp').onclick = updatesHelp;
  $('#bk').onclick = async () => { download(await stamped(), `backup_${stamp()}.json`); await log('backup', 'download'); toast(t('downloaded')); rerender(); };
  $('#updSend').onclick = async () => {
    const he = S.cfg.lang === 'he', n = pendingUpdates().length; if (!n) { toast(he ? 'אין עדכונים חדשים לשליחה' : 'No new updates to send'); return; }
    const items = pendingUpdates(), r = await shareOrDownload(await exportUpdatesBlob(items), `updates_${safeName(S.cfg.worker || 'worker')}_${stamp()}.json`, he ? 'עדכוני קטלוג' : 'Catalog updates');
    if (r === 'cancel') return; await markUpdatesSent(items); await log('updates', `sent ${n}`); if (r === 'downloaded') toast(t('downloaded')); else toast(he ? '✓ העדכונים נשלחו' : '✓ Updates sent'); rerender();
  };
  $('#updLog').onclick = updatesLog;
  $('#bks').onclick = async () => { await shareOrDownload(await stamped(), `backup_${stamp()}.json`, t('backup_full')); await log('backup', 'share'); rerender(); };
  const rs = $('#rs'); if (rs) { rs.onclick = () => $('#rsf').click(); $('#rsf').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    let b; try { b = JSON.parse(await readFileText(f)); if (b.kind !== 'backup') throw 0; } catch { return alertDlg(t('bad_file')); }
    const newI = b.items.filter(i => !S.byId.has(i.id)).length, newD = b.docs.filter(d => !S.docs.some(x => x.id === d.id)).length, bothI = b.items.length - newI, bothD = b.docs.length - newD;
    const m = openModal({ title: t('restore'), content: `<p class="msg">${esc(t('restore_msg', { d: fmtDateTime(b.createdAt, S.cfg.lang), n: b.items.length, k: b.docs.length }))}</p>
      <div class="card" style="padding:10px;margin:8px 0"><b>${esc(LL('מיזוג – להוסיף מה שחסר', 'Merge – add what is missing'))}</b>
        <p class="hint">${esc(LL(`יתווספו ${newI} פריטים ו-${newD} מסמכים שלא קיימים אצלך, ושום דבר לא יימחק. ${bothI} פריטים ו-${bothD} מסמכים קיימים גם אצלך. מה לעשות בהם?`, `${newI} items and ${newD} documents you do not have will be added and nothing is deleted. ${bothI} items and ${bothD} documents exist on both sides. What to do with them?`))}</p>
        <label style="display:block;margin:4px 0"><input type="radio" name="pol" value="newer" checked> ${esc(LL('להשאיר את העדכני יותר (לפי תאריך עדכון)', 'Keep the newer one (by update date)'))}</label>
        <label style="display:block;margin:4px 0"><input type="radio" name="pol" value="mine"> ${esc(LL('להשאיר את מה שיש לי', 'Keep what I have'))}</label>
        <label style="display:block;margin:4px 0"><input type="radio" name="pol" value="file"> ${esc(LL('להחליף בגרסה מהקובץ', 'Replace with the file\'s version'))}</label></div>
      <p class="hint">${esc(LL('"החלפה" מוחקת את כל הנתונים הקיימים ומחליפה אותם במה שבקובץ.', '"Replace" deletes all current data and loads the file instead.'))}</p>`,
      actions: `<button class="btn" data-a="x">${esc(t('cancel'))}</button><button class="btn primary" data-a="merge">${esc(LL('מיזוג', 'Merge'))}</button><button class="btn danger" data-a="replace">${esc(LL('החלפת הכול', 'Replace everything'))}</button>` });
    m.$$('[data-a]').forEach(bt => bt.onclick = async () => { const a = bt.dataset.a; if (a === 'x') return m.close(); if (a === 'replace' && !(await confirmDlg(t('restore_replace_confirm'), { danger: true, ok: LL('החלפת הכול', 'Replace everything') }))) return; const pol = m.$('input[name=pol]:checked')?.value || 'newer'; m.close(); try { await restoreAll(b, a, pol); toast(t('restored')); rerender(); } catch (er) { alertDlg(t('bad_file')); } });
  }; }
  const imp = $('#imp'); if (imp) { imp.onclick = () => $('#impf').click(); $('#impf').onchange = e => { importFiles([...e.target.files]); e.target.value = ''; }; }
  { const he = S.cfg.lang === 'he';
    $('#catSend').onclick = async () => { await shareOrDownload(await exportCatalogBlob(), `catalog_${stamp()}.json`, he ? 'קטלוג' : 'Catalog'); await log('catalog', 'share'); };
    $('#catGet').onclick = () => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json,.txt,text/plain'; inp.onchange = async () => { const f = inp.files[0]; if (!f) return; let b; try { b = JSON.parse(await readFileText(f)); if (b.kind !== 'catalog') throw 0; } catch { return alertDlg(he ? 'זה לא קובץ קטלוג' : 'Not a catalog file'); } if (!(await confirmDlg(he ? `לקבל קטלוג עם ${b.items.length} פריטים? הקטלוג הנוכחי יוחלף. הספירות וההזמנות שלך לא ייפגעו.` : `Load a catalog of ${b.items.length} items? The current catalog is replaced. Your counts and orders are kept.`, { ok: he ? 'קבל' : 'Load' }))) return; await importCatalog(b); toast(he ? 'הקטלוג עודכן' : 'Catalog updated'); rerender(); }; inp.click(); };
    $('#catReset').onclick = () => {
      const m = openModal({ title: he ? 'שחזור קטלוג לברירת מחדל' : 'Restore default catalog', content: `<div style="background:#fdecec;border:1px solid #e5484d;color:#b42318;border-radius:12px;padding:12px;font-weight:600;line-height:1.5">${he ? '⚠️ אזהרה: הפעולה מוחקת לצמיתות את כל הפריטים והתמונות שהוספת או שינית בקטלוג (שמות, מק\"טים, יחידות, פריטים חדשים). לא ניתן לבטל.' : '⚠️ Warning: this permanently deletes every item and photo you added or changed in the catalog (names, SKUs, units, new items). It cannot be undone.'}</div><p class="hint" style="margin-top:10px">${he ? 'ספירות והזמנות לא נמחקות. מומלץ קודם לייצא גיבוי של הקטלוג.' : 'Counts and orders are kept. Export a catalog backup first.'}</p>`,
        actions: `<button class="btn" data-a="x">${he ? 'ביטול' : 'Cancel'}</button><button class="btn danger" data-a="go">${he ? 'מחק והחזר לברירת מחדל' : 'Delete & restore'}</button>` });
      m.$('[data-a="x"]').onclick = () => m.close();
      m.$('[data-a="go"]').onclick = async () => { m.close(); await restoreDefaultCatalog(); toast(he ? 'הקטלוג שוחזר' : 'Catalog restored'); rerender(); };
    }; }
  $('#expcat').onclick = () => exportDialog({ kind: 'catalog', items: S.items, name: 'catalog' });
  $('#hist').onclick = historyView;
  $('#upd').onclick = async () => {
    const msg = $('#updMsg'); msg.textContent = t('checking'); const r = await checkForUpdate();
    msg.textContent = r.status === 'ready' ? t('update_ready') : r.status === 'latest' ? t('up_to_date') : r.status === 'offline' ? t('offline') : t('error');
    if (r.status === 'ready' && await confirmDlg(t('update_now_q'), { ok: t('update_now') })) applyUpdate();
  };
  $('#instApp').onclick = async () => {
    const he = S.cfg.lang === 'he';
    if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) return toast(he ? 'האפליקציה כבר מותקנת במכשיר הזה' : 'The app is already installed on this device');
    const ev = window.__pwaInstall; if (ev) { ev.prompt(); await ev.userChoice.catch(() => {}); window.__pwaInstall = null; return; }
    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    alertDlg(ios ? (he ? 'באייפון: פתח את הקישור ב-Safari, לחץ על כפתור השיתוף (ריבוע עם חץ) ובחר "הוסף למסך הבית".' : 'iPhone: open the link in Safari, tap the Share button (square with an arrow) and choose "Add to Home Screen".')
      : (he ? 'באנדרואיד: בתפריט הדפדפן (שלוש הנקודות ⋮) בחר "התקנת אפליקציה" או "הוסף למסך הבית". אם האפשרות לא מופיעה, פתח את הקישור ב-Chrome.' : 'Android: in the browser menu (⋮) choose "Install app" or "Add to Home screen". If it is missing, open the link in Chrome.'));
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
// log of every "send catalog updates": date, how many items, and a button to send the same updates again (to anyone)
function updatesLog() {
  const he = S.cfg.lang === 'he', log = S.cfg.updLog || [];
  const m = openModal({ title: he ? 'יומן שליחות' : 'Send log', wide: true, content: `<p class="hint">${esc(he ? 'כל שליחה של עדכוני קטלוג נשמרת כאן. "שלח שוב" שולח אותם מחדש, גם למישהו אחר, עם הגרסה העדכנית של אותם פריטים.' : 'Every catalog-updates send is kept here. "Send again" sends the same items again, also to someone else, with their current version.')}</p><div class="list">${log.map((e, i) => `<div class="lrow"><span class="grow"><b>${esc(fmtDateTime(e.ts, S.cfg.lang))}</b> · ${e.n} ${esc(he ? 'פריטים' : 'items')}<br><small>${esc((e.names || []).join(', '))}${e.n > 3 ? '…' : ''}</small></span><button class="btn sm" data-re="${i}">${ic('share', 14)} ${esc(he ? 'שלח שוב' : 'Send again')}</button></div>`).join('') || `<p class="hint">${esc(he ? 'עדיין לא נשלחו עדכונים' : 'Nothing sent yet')}</p>`}</div>` });
  m.$$('[data-re]').forEach(b => b.onclick = async () => {
    const e = log[+b.dataset.re], items = (e.ids || []).map(id => S.byId.get(id)).filter(Boolean);
    if (!items.length) return toast(he ? 'הפריטים האלה כבר לא קיימים' : 'Those items no longer exist');
    const r = await shareOrDownload(await exportUpdatesBlob(items), `updates_${safeName(S.cfg.worker || 'worker')}_${stamp()}.json`, he ? 'עדכוני קטלוג' : 'Catalog updates');
    if (r === 'downloaded') toast(t('downloaded')); else if (r !== 'cancel') toast(he ? '✓ נשלח שוב' : '✓ Sent again');
  });
}
function historyView() {
  const icon = { 'item+': '＋', 'item~': '✎', 'item-': '✕' };
  openModal({ title: t('history'), wide: true, content: `<div class="list">${S.log.slice(0, 200).map(l => `<div class="lrow"><span class="mono small">${esc(fmtDateTime(l.ts, S.cfg.lang))}</span><span class="grow"><b>${esc(l.action)}</b> ${esc(l.text || '')}</span>${l.by ? `<small>${esc(l.by)}</small>` : ''}</div>`).join('') || `<p class="hint">${esc(t('none'))}</p>`}</div>` });
}
