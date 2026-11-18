// "Send / save file" dialog: the file is prepared BEFORE the dialog opens, so tapping "Share" is a fresh tap and the phone's share menu
// (Gmail, Outlook, WhatsApp, ...) really opens (browsers refuse to open it when a long preparation happened after the tap).
import { S } from '../store.js';
import { esc, download, toast, copyText } from '../util.js';
import { ic } from '../icons.js';
import { openModal } from '../modal.js';

const LL = (he, en) => (S.cfg.lang === 'he' ? he : en);
async function shareFile(blob, name, title) {
  const tryShare = async (b, n) => { const file = new File([b], n, { type: b.type || 'application/octet-stream' }); if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: title || n }); return true; } return false; };
  try {
    if (await tryShare(blob, name)) return 'shared';
    if (/json/.test(blob.type) && await tryShare(new Blob([blob], { type: 'text/plain' }), name.replace(/\.json$/i, '.json.txt'))) return 'shared';   // some phones refuse ".json"
  } catch (e) { if (e.name === 'AbortError') return 'cancel'; }
  return 'unsupported';
}
/** resolves to 'shared' | 'downloaded' | null (closed without sending) */
export function sendDialog({ blob, name, title, info = '', email = '' }) {
  return new Promise(res => {
    let result = null;
    const m = openModal({ title: title || LL('שליחת קובץ', 'Send file'), content: `${info ? `<p class="hint">${esc(info)}</p>` : ''}
      <div class="exl">
        <button class="exr" type="button" data-sh><span class="exc" style="background:#2563eb">${ic('share', 18)}</span><span class="ext"><b>${esc(LL('שיתוף…', 'Share…'))}</b><small>${esc(LL('Gmail, Outlook, וואטסאפ ואפליקציות נוספות במכשיר', 'Gmail, Outlook, WhatsApp and other apps on this device'))}</small></span></button>
        <button class="exr" type="button" data-dl><span class="exc" style="background:#475569">${ic('download', 18)}</span><span class="ext"><b>${esc(LL('הורדה למכשיר', 'Download to this device'))}</b><small>${esc(LL('שמירה בטלפון / במחשב, ואז אפשר לצרף ידנית', 'Save on the phone / computer, then attach it manually'))}</small></span></button>
      </div>
      ${email ? `<div class="mail"><span class="hint" style="margin:0">${esc(LL('כתובת המנהל:', 'Manager address:'))}</span><b>${esc(email)}</b><button class="btn sm" type="button" data-copy>${esc(LL('העתק כתובת', 'Copy address'))}</button></div>` : ''}`,
      actions: `<span class="grow"></span><button class="btn" data-no>${esc(LL('סגור', 'Close'))}</button>`, onClose: () => res(result) });
    m.$('[data-no]').onclick = () => m.close();
    m.$('[data-sh]').onclick = async () => {
      const r = await shareFile(blob, name, title);
      if (r === 'shared') { result = 'shared'; m.close(); } else if (r === 'unsupported') toast(LL('השיתוף לא נתמך בדפדפן הזה. אפשר להוריד את הקובץ.', 'Sharing is not supported in this browser. You can download the file.'), 3800);
    };
    m.$('[data-dl]').onclick = () => { download(blob, name); toast(LL('הקובץ הורד', 'File downloaded')); result = 'downloaded'; m.close(); };
    const cp = m.$('[data-copy]'); if (cp) cp.onclick = async () => { toast((await copyText(email)) ? LL('הכתובת הועתקה', 'Address copied') : email); };
  });
}
