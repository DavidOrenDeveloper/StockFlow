import { openModal } from '../modal.js';
import { t } from '../i18n.js';
import { esc, download, toast } from '../util.js';
import { ic } from '../icons.js';
import { docXlsx, docXlsxName, docPdf, shareDocJson, skuClipboardText, catalogXlsx, catalogPdf } from '../exporter.js';
import { S, saveDoc, log } from '../store.js';
import { shareImages, waText, openWhatsApp } from '../waShare.js';

const chk = (k, label, on) => `<label class="chk"><input type="checkbox" data-o="${k}" ${on ? 'checked' : ''}><span>${esc(label)}</span></label>`;
/** kind 'doc' -> {doc} ; kind 'catalog' -> {items, name} */
export function exportDialog({ kind, doc, items, name = 'catalog' }) {
  const isDoc = kind === 'doc', isCount = isDoc && doc.type === 'count';
  const opts = isDoc
    ? (isCount ? chk('onlyCounted', t('opt_only_counted'), false) : chk('onlyQty', t('opt_only_ordered'), true)) + chk('en', t('opt_en'), true) + chk('tr', t('opt_tr'), false) + chk('emergency', t('opt_emergency'), isCount) + chk('img', t('opt_img_pdf'), false)
    : chk('qtyCol', t('opt_qty_col'), true) + chk('img', t('opt_img_pdf'), false);
  const btns = `<button class="btn primary" data-a="xlsx">${ic('table')} Excel</button><button class="btn primary" data-a="pdf">${ic('file')} PDF</button>` +
    (isDoc ? `<button class="btn wa" data-a="waimg">${ic('image')} ${esc(t('wa_image'))}</button><button class="btn wa" data-a="watxt">${ic('share')} ${esc(t('wa_text'))}</button><button class="btn" data-a="json">${ic('share')} ${esc(t('send_to_manager'))}</button><button class="btn" data-a="jsondl">${ic('download')} JSON</button>${isCount ? '' : `<button class="btn" data-a="copy">${ic('copy')} ${esc(t('copy_priority'))}</button>`}` : `<button class="btn" data-a="copy">${ic('copy')} ${esc(t('copy_priority'))}</button>`);
  const m = openModal({ title: t('export'), content: `<div class="optgrid">${opts}</div><p class="hint">${esc(t('pdf_hint'))}</p><div class="btnrow wrap">${btns}</div>` });
  const get = () => Object.fromEntries(m.$$('[data-o]').map(i => [i.dataset.o, i.checked]));
  m.$$('[data-a]').forEach(b => b.onclick = async () => {
    const o = get(), a = b.dataset.a;
    try {
      if (a === 'xlsx') { download(isDoc ? docXlsx(doc, o) : catalogXlsx(items, o), isDoc ? docXlsxName(doc) : `${name}.xlsx`); }
      else if (a === 'pdf') { isDoc ? docPdf(doc, o) : catalogPdf(items, o); }
      else if (a === 'json' || a === 'jsondl') { await saveDoc(doc, { quiet: true }); const r = await shareDocJson(doc, { share: a === 'json' }); await saveDoc(doc, { quiet: true }); await log('export', `${doc.type} json`, doc.id); if (r === 'downloaded') toast(t('downloaded')); }
      else if (a === 'waimg') { const r = await shareImages(doc, o); if (r === 'downloaded') toast(t('downloaded')); }
      else if (a === 'watxt') openWhatsApp(waText(doc, o));
      else if (a === 'copy') { const txt = isDoc ? skuClipboardText(doc, o) : items.map(i => [i.sku, i.he, ''].join('\t')).join('\n'); await navigator.clipboard.writeText(txt); toast(t('copied')); }
      if (isDoc && a !== 'copy') { await log('export', `${doc.type} ${a}`, doc.id); }
    } catch (e) { console.error(e); toast(t('error') + ': ' + (e.message || e)); }
  });
}
