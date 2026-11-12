export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = (p = 'x') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const pad = n => String(n).padStart(2, '0');
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const stamp = () => { const d = new Date(); return `${today()}_${pad(d.getHours())}${pad(d.getMinutes())}`; };
export const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const safeName = s => String(s || '').trim().replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^_+|_+$/g, '') || 'x';
export const fmtDate = (iso, lang = 'he') => { if (!iso) return ''; const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso); return d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
export const fmtDateTime = (iso, lang = 'he') => iso ? new Date(iso).toLocaleString(lang === 'he' ? 'he-IL' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '';
export const num = v => (v === '' || v == null || isNaN(Number(v))) ? null : Number(v);
export const fmtQty = v => v == null ? '' : (Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000));

export function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
export async function shareOrDownload(blob, name, title) {
  const tryShare = async (b, n) => { const file = new File([b], n, { type: b.type || 'application/octet-stream' }); if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: title || n }); return true; } return false; };
  try {
    if (await tryShare(blob, name)) return 'shared';
    // some phones refuse to share ".json" files: retry as a text file (same content, name ends with .json.txt)
    if (/json/.test(blob.type) && await tryShare(new Blob([blob], { type: 'text/plain' }), name.replace(/\.json$/i, '.json.txt'))) return 'shared';
  } catch (e) { if (e.name === 'AbortError') return 'cancel'; }
  download(blob, name); return 'downloaded';
}
export const blobToDataURL = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
export const dataURLToBlob = async u => (await fetch(u)).blob();
export const readFileText = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(f); });

// resize picked photo -> webp blob (max side px)
export async function resizeImage(file, max = 640) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(b => r(b), 'image/webp', 0.82));
}
let toastT;
export function toast(msg, ms = 2400) {
  let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms);
}

/** HTML-safe text where every Latin / number run (e.g. "CEE 3X16", "N-1A") is isolated, so it keeps its typed order inside Hebrew text */
export const bidi = x => String(x ?? '').split(/([A-Za-z0-9](?:[A-Za-z0-9.,:;/\\\-*×+()%#_&'"]| (?=[A-Za-z0-9(]))*)/).map((p, i) => {
  if (i % 2 === 0) return esc(p);
  // brackets must NOT end up half-inside the LTR island (that is what flipped "(" and ")"): push a trailing "(" / unmatched ")" / space back out
  let tail = '';
  for (;;) {
    const c = p.slice(-1), o = (p.match(/\(/g) || []).length, cl = (p.match(/\)/g) || []).length;
    if (c === ' ' || c === '(' || (c === ')' && cl > o)) { tail = c + tail; p = p.slice(0, -1); } else break;
  }
  return `<bdi dir="ltr">${esc(p)}</bdi>${esc(tail)}`;
}).join('');
