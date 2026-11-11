// Excel / PDF(print) / JSON / clipboard exports. All client-side, nothing leaves the device unless the user shares the file.
import { S, nm, catOf, unitOf, siteOf, docItems, docEnvelope, backupAll, imgOf } from './store.js';
import { t, dir } from './i18n.js';
import { buildXlsx } from './xlsx.js';
import { esc, fmtDate, fmtDateTime, safeName, download, shareOrDownload, stamp, fmtQty } from './util.js';

/** any image address (blob: / same-origin file) -> self-contained data: URL, so printing and sharing never lose a picture */
export async function toDataUrl(src) {
  if (!src || src.startsWith('data:')) return src || '';
  const b = await (await fetch(src)).blob();
  return await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
}
export async function inlineImgs(lines) {
  const cache = new Map();
  await Promise.all([...new Set(lines.map(l => l.img).filter(Boolean))].map(async u => { try { cache.set(u, await toDataUrl(u)); } catch (e) { cache.set(u, ''); } }));
  return lines.map(l => ({ ...l, img: cache.get(l.img) || '' }));
}
const L3 = (it, snap, k) => it ? (k === 'he' ? it.he : k === 'en' ? it.en : it.tr || nm(it, 'tr')) : (snap ? (k === 'he' ? snap.he : k === 'en' ? snap.en : snap.tr) : '');
const unitName = (it, snap) => it ? nm(unitOf(it.unit), 'he') : (snap?.unit || '');
const catName = (it, snap) => it ? nm(catOf(it.cat), 'he') : (snap?.cat || '');
const catRank = it => (it ? Math.max(0, S.cats.findIndex(c => c.id === it.cat)) : 999);

export function docLines(d, o = {}) {
  let rows = docItems(d).map(r => ({ ...r, qty: d.lines[r.id] ?? null }));
  if (d.type === 'order' ? o.onlyQty !== false : o.onlyQty) rows = rows.filter(r => (r.qty ?? 0) > 0);
  else if (o.onlyCounted) rows = rows.filter(r => r.qty != null);
  rows.sort((a, b) => catRank(a.it) - catRank(b.it) || (a.it?.order ?? 9e9) - (b.it?.order ?? 9e9));
  return rows.map(r => ({
    sku: r.it?.sku ?? r.snap?.sku ?? '', he: L3(r.it, r.snap, 'he'), en: L3(r.it, r.snap, 'en'), tr: L3(r.it, r.snap, 'tr'), cat: catName(r.it, r.snap),
    unit: unitName(r.it, r.snap), qty: r.qty, emergency: r.it?.emergency ?? r.snap?.emergency ?? null, img: imgOf(r.it), note: d.notes?.[r.id] || ''
  }));
}
const docMeta = d => [
  [t('type'), d.type === 'count' ? t('count') : t('order')], [t('site'), nm(siteOf(d.site), 'he') || ''], [t('worker'), d.worker || ''],
  [t('date'), fmtDate(d.date, 'en')], [t('status'), t('st_' + d.status)], [t('note'), d.note || '']
].filter(m => m[1]);
export const docTitle = d => `${d.type === 'count' ? t('count') : t('order')} · ${nm(siteOf(d.site), 'he')} · ${fmtDate(d.date, 'en')}`;
const fileBase = d => `${d.type}_${safeName(nm(siteOf(d.site), 'he'))}_${safeName(d.worker)}_${d.date}`;

function docColumns(d, o, lines) {
  const cols = [{ h: t('sku'), w: 18, f: r => r.sku, s: 2 }, { h: t('name_he'), w: 34, f: r => r.he, s: 2 }];
  if (o.en) cols.push({ h: t('name_en'), w: 30, f: r => r.en, s: 2 });
  if (o.tr) cols.push({ h: t('name_tr'), w: 26, f: r => r.tr, s: 2 });
  if (lines?.some(l => l.note)) cols.push({ h: t('note'), w: 24, f: r => r.note, s: 2 });
  cols.push({ h: t('category'), w: 16, f: r => r.cat, s: 2 }, { h: t('unit'), w: 10, f: r => r.unit, s: 3 });
  cols.push({ h: d.type === 'count' ? t('counted') : t('qty_order'), w: 12, f: r => r.qty ?? (d.type === 'count' ? '—' : ''), s: 6 });
  if (o.emergency) cols.push({ h: t('emergency'), w: 10, f: r => r.emergency ?? '', s: 3 });
  if (o.emergency && d.type === 'count') cols.push({ h: t('shortage'), w: 10, f: r => (r.emergency != null && r.qty != null ? Math.max(0, r.emergency - r.qty) : ''), s: 3 });
  return cols;
}
export function docXlsx(d, o = {}) {
  const lines = docLines(d, o), cols = docColumns(d, o, lines), meta = docMeta(d);
  const rows = [[{ v: docTitle(d), s: 4 }], ...meta.map(m => [{ v: m[0], s: 5 }, { v: m[1], s: 2 }]), [], cols.map(c => ({ v: c.h, s: 1 }))];
  const headerRow = rows.length;
  lines.forEach(l => rows.push(cols.map(c => { const v = c.f(l); return { v: typeof v === 'number' ? v : String(v ?? ''), s: c.s }; })));
  return buildXlsx([{ name: d.type === 'count' ? t('count') : t('order'), rtl: dir() === 'rtl', titleRow: true, headerRow, widths: cols.map(c => c.w), rows }]);
}
export function catalogXlsx(items, o = {}) {
  const cols = [{ h: t('sku'), w: 18, f: i => i.sku, s: 2 }, { h: t('name_he'), w: 34, f: i => i.he, s: 2 }, { h: t('name_en'), w: 30, f: i => i.en, s: 2 }, { h: t('name_tr'), w: 26, f: i => i.tr, s: 2 },
    { h: t('category'), w: 16, f: i => nm(catOf(i.cat), 'he'), s: 2 }, { h: t('unit'), w: 10, f: i => nm(unitOf(i.unit), 'he'), s: 3 }, { h: t('emergency'), w: 10, f: i => i.emergency ?? '', s: 3 }];
  if (o.qtyCol) cols.push({ h: t('qty_order'), w: 12, f: () => '', s: 6 });
  const rows = [[{ v: t('catalog') + ' · ' + fmtDate(new Date().toISOString().slice(0, 10), 'en'), s: 4 }], [], cols.map(c => ({ v: c.h, s: 1 }))];
  items.forEach(i => rows.push(cols.map(c => { const v = c.f(i); return { v: typeof v === 'number' ? v : String(v ?? ''), s: c.s }; })));
  return buildXlsx([{ name: t('catalog'), rtl: dir() === 'rtl', titleRow: true, headerRow: 3, widths: cols.map(c => c.w), rows }]);
}
// ---------- PDF via the browser's print engine (full Hebrew/RTL support, works offline) ----------
export function printHtml(title, metaPairs, head, body, { rtl = dir() === 'rtl', landscape = false } = {}) {
  const html = `<!doctype html><html lang="${rtl ? 'he' : 'en'}" dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
  @page{size:A4 ${landscape ? 'landscape' : 'portrait'};margin:12mm}*{box-sizing:border-box}body{font-family:"Segoe UI",Arial,sans-serif;color:#17202f;font-size:11.5px;margin:0}
  h1{font-size:19px;margin:0 0 4px;color:#1f3a5f}.meta{display:flex;flex-wrap:wrap;gap:4px 22px;margin:6px 0 12px;font-size:11.5px}.meta b{color:#52607a;font-weight:600}
  table{width:100%;border-collapse:collapse}th{background:#1f5fbf;color:#fff;padding:6px 6px;font-weight:600;text-align:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  td{border:1px solid #c9d3e0;padding:4px 6px;vertical-align:middle}tr{page-break-inside:avoid}thead{display:table-header-group}tr:nth-child(even) td{background:#f5f8fc;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  td{overflow-wrap:anywhere}td.c{text-align:center}td.q{text-align:center;font-weight:700;font-size:13px}td img{height:34px;width:34px;object-fit:contain;display:block;margin:auto}.foot{margin-top:10px;font-size:10px;color:#6b7893}
  </style></head><body><h1>${esc(title)}</h1><div class="meta">${metaPairs.map(m => `<span><b>${esc(m[0])}:</b> ${esc(m[1])}</span>`).join('')}</div>
  <table><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table><div class="foot">${esc(t('generated'))} ${esc(fmtDateTime(new Date().toISOString(), 'en'))}</div></body></html>`;
  const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;inset-inline-end:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  const oldTitle = document.title; document.title = title;   // the phone's "save as PDF" suggests this as the file name (editable there)
  document.body.appendChild(f); f.srcdoc = html;
  f.onload = () => {
    const w = f.contentWindow, imgs = [...w.document.images];
    Promise.all(imgs.map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))).then(() => { w.focus(); w.print(); setTimeout(() => { f.remove(); document.title = oldTitle; }, 60000); });
  };
}
export async function docPdf(d, o = {}) {
  let lines = docLines(d, o); const cols = docColumns(d, o, lines);
  if (o.img) lines = await inlineImgs(lines);
  const head = ['#', ...(o.img ? [t('image')] : []), ...cols.map(c => c.h)];
  const body = lines.map((l, i) => `<tr><td class="c">${i + 1}</td>${o.img ? `<td>${l.img ? `<img src="${l.img}">` : ''}</td>` : ''}${cols.map((c, ci) => { const v = c.f(l); return `<td class="${c.s === 6 ? 'q' : c.s === 3 ? 'c' : ''}">${esc(typeof v === 'number' ? fmtQty(v) : v)}</td>`; }).join('')}</tr>`).join('');
  printHtml(docTitle(d), docMeta(d), head, body);
}
export async function catalogPdf(items, o = {}) {
  const urls = o.img ? await inlineImgs(items.map(i => ({ img: imgOf(i) }))) : [];
  const head = ['#', ...(o.img ? [t('image')] : []), t('sku'), t('name_he'), t('name_en'), t('name_tr'), t('category'), t('unit'), ...(o.qtyCol ? [t('qty_order')] : [])];
  const body = items.map((i, n) => `<tr><td class="c">${n + 1}</td>${o.img ? `<td>${urls[n]?.img ? `<img src="${urls[n].img}">` : ''}</td>` : ''}<td>${esc(i.sku)}</td><td>${esc(i.he)}</td><td>${esc(i.en)}</td><td>${esc(i.tr)}</td><td>${esc(nm(catOf(i.cat), 'he'))}</td><td class="c">${esc(nm(unitOf(i.unit), 'he'))}</td>${o.qtyCol ? '<td class="q"></td>' : ''}</tr>`).join('');
  printHtml(t('catalog'), [[t('items'), String(items.length)]], head, body);
}
// ---------- JSON / clipboard ----------
export const docJsonBlob = d => new Blob([JSON.stringify(docEnvelope(d), null, 1)], { type: 'application/json' });
export const docJsonName = d => fileBase(d) + '.json';
export async function shareDocJson(d, { share = true } = {}) {
  d.exportedAt = new Date().toISOString();
  const blob = docJsonBlob(d), name = docJsonName(d);
  if (share) return shareOrDownload(blob, name, docTitle(d)); download(blob, name); return 'downloaded';
}
export const docXlsxName = d => fileBase(d) + '.xlsx';
export function skuClipboardText(d, o = {}) { // paste-ready for Priority: SKU <tab> qty <tab> description <tab> unit
  return docLines(d, { ...o, onlyQty: true }).map(l => [l.sku, fmtQty(l.qty), l.he, l.unit].join('\t')).join('\n');
}
export async function backupDownload() { const b = await backupAll(); download(new Blob([JSON.stringify(b)], { type: 'application/json' }), `backup_${stamp()}.json`); }
