import { openModal, promptDlg } from '../modal.js';
import { t } from '../i18n.js';
import { esc, download, toast, shareOrDownload } from '../util.js';
import { ic } from '../icons.js';
import { confirmDlg } from '../modal.js';
import { docTitle, docLines, docXlsx, docXlsxName, docPdf, shareDocJson, skuClipboardText, catalogXlsx, catalogPdf } from '../exporter.js';
import { S, saveDoc, log, nm, unitOf } from '../store.js';
import { shareImages, waText, openWhatsApp } from '../waShare.js';

const chk = (k, label, on) => `<label class="chk"><input type="checkbox" data-o="${k}" ${on ? 'checked' : ''}><span>${esc(label)}</span></label>`;
/** kind 'doc' -> {doc} ; kind 'catalog' -> {items, name} */
export function exportDialog({ kind, doc, items, name = 'catalog' }) {
  const isDoc = kind === 'doc', isCount = isDoc && doc.type === 'count';
  const opts = isDoc
    ? (isCount ? chk('onlyCounted', t('opt_only_counted'), true) : chk('onlyQty', t('opt_only_ordered'), true)) + chk('en', t('opt_en'), false) + chk('tr', t('opt_tr'), false) + chk('emergency', t('opt_emergency'), false) + chk('img', t('opt_img_pdf'), true)
    : chk('qtyCol', t('opt_qty_col'), true) + chk('img', t('opt_img_pdf'), true);
  const he = S.cfg.lang === 'he';
  const chip = (bg, inner) => `<span class="exc" style="background:${bg}">${inner}</span>`;
  const WA = chip('#25D366', '<svg viewBox="0 0 24 24" width="20" height="20" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>');
  const exr = (a, c, title, sub) => `<button class="exr" data-a="${a}">${c}<span class="ext"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span></button>`;
  const btns = `<button class="btn sm" data-a="preview">${ic('eye', 16)} ${he ? 'תצוגה מקדימה' : 'Preview'}</button><div class="exl">` +
    exr('pdf', chip('#E5484D', '<b style="font-size:10px">PDF</b>'), 'PDF', he ? 'להדפסה או לשמירה (תבחר שם לקובץ)' : 'Print or save (you choose the file name)') +
    exr('xlsx', chip('#1D7A46', '<b style="font-size:15px">X</b>'), 'Excel', he ? 'הורדת קובץ אקסל' : 'Download an Excel file') +
    exr('xshare', chip('#6B7280', ic('share', 18)), he ? 'שליחת Excel (מייל / אפליקציה)' : 'Send Excel (email / app)', he ? 'פותח את תפריט השיתוף של הטלפון: Gmail, Outlook ועוד — הקובץ מצורף' : 'Opens the phone share menu (Gmail, Outlook…) with the file attached') +
    (isDoc ? exr('waimg', WA, he ? 'וואטסאפ — תמונה' : 'WhatsApp — image', he ? 'תמונה של הרשימה' : 'A picture of the list') +
      exr('watxt', WA, he ? 'וואטסאפ — טקסט' : 'WhatsApp — text', he ? 'הרשימה כהודעת טקסט' : 'The list as a text message') +
      `<div class="exr2"><button class="exr" data-a="gmail">${chip('#EA4335', '<b style="font-size:15px">M</b>')}<span class="ext"><b>Gmail</b><small>${he ? 'טקסט הרשימה בגוף המייל' : 'List as the email body'}</small></span></button><button class="exr" data-a="outlook">${chip('#0A64C9', '<b style="font-size:15px">O</b>')}<span class="ext"><b>Outlook</b><small>${he ? 'טקסט הרשימה בגוף המייל' : 'List as the email body'}</small></span></button></div>` +
      (isCount ? '' : exr('copy', chip('#6B7280', ic('copy', 18)), he ? 'העתק לפריוריטי' : 'Copy for Priority', he ? 'מעתיק מק"ט וכמות להדבקה במערכת פריוריטי' : 'Copies SKU + quantity to paste into Priority')) +
      exr('json', chip('#3B6DF0', ic('share', 18)), he ? 'שלח למנהל (קובץ ייבוא)' : 'Send to manager (import file)', he ? 'קובץ שהמנהל פותח באפליקציה כדי לקבל את המסמך כמו שהוא — לא מיועד לקריאה' : 'A file the manager opens in the app to receive this document as is') : '') + '</div>';
  const m = openModal({ title: t('export'), content: `<div class="optgrid">${opts}</div><p class="hint">${esc(t('pdf_hint'))}</p>${btns}` });
  const get = () => Object.fromEntries(m.$$('[data-o]').map(i => [i.dataset.o, i.checked]));
  const showPreview = o => {
    const he = S.cfg.lang === 'he';
    const rows = isDoc ? docLines(doc, o).map(l => ({ img: l.img, name: nm({ he: l.he, en: l.en, tr: l.tr }), sku: l.sku, unit: l.unit, qty: l.qty })) : items.map(i => ({ img: i.imgId ? S.img.get(i.imgId) : '', name: nm(i), sku: i.sku, unit: nm(unitOf(i.unit)), qty: null }));
    const miss = rows.filter(r => !r.sku).length;
    const body = rows.map((r, n) => `<tr style="border-top:1px solid var(--line)"><td style="padding:4px">${r.img ? `<img src="${r.img}" style="width:36px;height:36px;object-fit:contain">` : ''}</td><td style="padding:4px">${esc(r.name)}<br><small>${r.sku ? `${esc(t('sku'))}: <b dir="ltr">${esc(r.sku)}</b>` : `<span style="color:#c0392b">${he ? 'ללא מק"ט' : 'No SKU'}</span>`}</small></td><td style="padding:4px;text-align:center;white-space:nowrap"><b>${r.qty == null ? '—' : esc(String(r.qty))}</b><br><small>${esc(r.unit || '')}</small></td></tr>`).join('');
    openModal({ title: he ? 'תצוגה מקדימה' : 'Preview', content: `<p class="hint">${rows.length} ${he ? 'שורות' : 'lines'}${miss ? ` · <span style="color:#c0392b">${miss} ${he ? 'ללא מק"ט' : 'without SKU'}</span>` : ''}</p><div style="max-height:60vh;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:14px">${body || `<tr><td>${he ? 'אין שורות לשליחה' : 'Nothing to send'}</td></tr>`}</table></div>` });
  };
  m.$$('[data-a]').forEach(b => b.onclick = async () => {
    const o = get(), a = b.dataset.a;
    if (a === 'preview') return showPreview(o);
    try {
      if (isDoc && ['xlsx', 'xshare', 'pdf', 'waimg', 'watxt', 'gmail', 'outlook', 'copy'].includes(a)) {
        const miss = docLines(doc, { onlyQty: !isCount, onlyCounted: isCount }).filter(l => !l.sku), he = S.cfg.lang === 'he';
        if (miss.length && !(await confirmDlg((he ? `ל-${miss.length} שורות אין מק"ט: ` : `${miss.length} lines have no SKU: `) + miss.slice(0, 5).map(l => l.he || l.en).join(', ') + (miss.length > 5 ? '…' : '') + (he ? '. לשלוח בכל זאת?' : '. Send anyway?'), { ok: he ? 'שלח בכל זאת' : 'Send anyway' }))) return;
      }
      if (a === 'xlsx') { download(isDoc ? docXlsx(doc, o) : catalogXlsx(items, o), isDoc ? docXlsxName(doc) : `${name}.xlsx`); }
      else if (a === 'pdf') {
        const def = (isDoc ? docTitle(doc) : name).replace(/[\\/:*?"<>|]/g, '-'), fn = await promptDlg(he ? 'שם הקובץ' : 'File name', def); if (fn == null) return;
        o.fileName = fn.trim() || def; await (isDoc ? docPdf(doc, o) : catalogPdf(items, o));
      }
      else if (a === 'xshare') { const r = await shareOrDownload(isDoc ? docXlsx(doc, o) : catalogXlsx(items, o), isDoc ? docXlsxName(doc) : `${name}.xlsx`, isDoc ? docTitle(doc) : name); if (r === 'downloaded') toast(t('downloaded')); }
      else if (a === 'gmail' || a === 'outlook') {
        const su = encodeURIComponent(docTitle(doc)), bo = encodeURIComponent(waText(doc, o).replace(/\*/g, ''));
        window.open(a === 'gmail' ? `https://mail.google.com/mail/?view=cm&fs=1&su=${su}&body=${bo}` : `https://outlook.live.com/mail/0/deeplink/compose?subject=${su}&body=${bo}`, '_blank');
      }
      else if (a === 'json' || a === 'jsondl') { await saveDoc(doc, { quiet: true }); const r = await shareDocJson(doc, { share: a === 'json' }); await saveDoc(doc, { quiet: true }); await log('export', `${doc.type} json`, doc.id); if (r === 'downloaded') toast(t('downloaded')); }
      else if (a === 'waimg') { const r = await shareImages(doc, o); if (r === 'downloaded') toast(t('downloaded')); }
      else if (a === 'watxt') openWhatsApp(waText(doc, o));
      else if (a === 'copy') { const txt = isDoc ? skuClipboardText(doc, o) : items.map(i => [i.sku, i.he, ''].join('\t')).join('\n'); await navigator.clipboard.writeText(txt); toast(t('copied')); }
      if (isDoc && a !== 'copy') { await log('export', `${doc.type} ${a}`, doc.id); }
    } catch (e) { console.error(e); toast(t('error') + ': ' + (e.message || e)); }
  });
}
