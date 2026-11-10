// WhatsApp-friendly sharing: the order/count is drawn as PNG picture(s) (photo + name + SKU + qty) that open instantly
// inside WhatsApp on any phone, plus a plain-text version via wa.me. No server involved.
import { S, nm, siteOf } from './store.js';
import { t, dir } from './i18n.js';
import { docLines, docTitle } from './exporter.js';
import { fmtQty, fmtDate, safeName, download } from './util.js';

const W = 1000, ROW = 104, HEAD = 190, PER = 13;
const loadImg = src => new Promise(r => { if (!src) return r(null); const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
const fit = (ctx, s, max) => { s = String(s ?? ''); if (ctx.measureText(s).width <= max) return s; while (s.length > 1 && ctx.measureText(s + '…').width > max) s = s.slice(0, -1); return s + '…'; };

export async function docImages(d, o = {}) {
  const lines = docLines(d, { onlyQty: d.type === 'order', onlyCounted: o.onlyCounted });
  const rtl = dir() === 'rtl', pages = Math.max(1, Math.ceil(lines.length / PER)), blobs = [];
  const imgs = await Promise.all(lines.map(l => loadImg(l.img)));
  const X = (x, w = 0) => rtl ? W - x - w : x;            // mirror helper
  for (let p = 0; p < pages; p++) {
    const part = lines.slice(p * PER, (p + 1) * PER), H = HEAD + part.length * ROW + 50;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.direction = rtl ? 'rtl' : 'ltr';
    g.fillStyle = '#1f5fbf'; g.fillRect(0, 0, W, 120);
    g.fillStyle = '#fff'; g.font = 'bold 40px Arial'; g.textAlign = rtl ? 'right' : 'left'; g.textBaseline = 'middle';
    g.fillText(fit(g, docTitle(d), W - 60), rtl ? W - 30 : 30, 48);
    g.font = '28px Arial'; g.fillText(fit(g, [d.worker, pages > 1 ? `${p + 1}/${pages}` : ''].filter(Boolean).join(' · '), W - 60), rtl ? W - 30 : 30, 92);
    g.fillStyle = '#52607a'; g.font = '24px Arial';
    const hdr = [[t('image'), 30, 100, 'c'], [t('name_he'), 140, 470, 'l'], [t('sku'), 620, 200, 'l'], [t('qty_order'), 830, 140, 'c']];
    hdr.forEach(([txt, x, w, a]) => { g.textAlign = a === 'c' ? 'center' : (rtl ? 'right' : 'left'); g.fillText(txt, a === 'c' ? X(x, w) + w / 2 : (rtl ? X(x, w) + w : X(x, w)), 152); });
    part.forEach((l, i) => {
      const y = HEAD + i * ROW; g.fillStyle = i % 2 ? '#f5f8fc' : '#fff'; g.fillRect(0, y, W, ROW);
      g.strokeStyle = '#dde4ef'; g.beginPath(); g.moveTo(0, y + ROW); g.lineTo(W, y + ROW); g.stroke();
      const im = imgs[p * PER + i];
      if (im) { const s = Math.min(84 / im.width, 84 / im.height); g.drawImage(im, X(34, 84) + (84 - im.width * s) / 2, y + 10 + (84 - im.height * s) / 2, im.width * s, im.height * s); }
      g.textAlign = rtl ? 'right' : 'left'; g.fillStyle = '#16202e'; g.font = 'bold 30px Arial';
      const tx = rtl ? X(140, 470) + 470 : X(140, 470);
      g.fillText(fit(g, nm({ he: l.he, en: l.en, tr: l.tr }), 460), tx, y + 38);
      g.font = '22px Arial'; g.fillStyle = '#64748b'; const sec = S.cfg.lang === 'he' ? (l.en || l.tr) : l.he; g.fillText(fit(g, [sec, l.unit].filter(Boolean).join(' · '), 460), tx, y + 76);
      g.font = 'bold 28px monospace'; g.fillStyle = '#16202e'; g.textAlign = rtl ? 'right' : 'left'; if (l.sku) { g.font = '20px Arial'; g.fillStyle = '#64748b'; g.fillText(t('sku'), rtl ? X(620, 200) + 200 : X(620, 200), y + ROW / 2 - 24); g.font = 'bold 28px monospace'; g.fillStyle = '#16202e'; } g.fillText(fit(g, l.sku || '—', 200), rtl ? X(620, 200) + 200 : X(620, 200), y + ROW / 2 + (l.sku ? 10 : 0));
      g.textAlign = 'center'; g.fillStyle = '#1f5fbf'; g.font = 'bold 44px Arial'; g.fillText(l.qty == null ? '—' : fmtQty(l.qty), X(830, 140) + 70, y + ROW / 2);
    });
    g.fillStyle = '#8a97ad'; g.font = '20px Arial'; g.textAlign = 'center'; g.fillText(`${fmtDate(d.date, 'en')} · ${nm(siteOf(d.site), 'he')}`, W / 2, H - 22);
    blobs.push(await new Promise(r => c.toBlob(r, 'image/png')));
  }
  return blobs;
}
export async function shareImages(d, o) {
  const blobs = await docImages(d, o), base = `${d.type}_${safeName(nm(siteOf(d.site), 'he'))}_${d.date}`;
  const files = blobs.map((b, i) => new File([b], `${base}${blobs.length > 1 ? '_' + (i + 1) : ''}.png`, { type: 'image/png' }));
  try { if (navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files, title: docTitle(d) }); return 'shared'; } } catch (e) { if (e.name === 'AbortError') return 'cancel'; }
  files.forEach(f => download(f, f.name)); return 'downloaded';
}
export function waText(d, o = {}) {
  const lines = docLines(d, { onlyQty: d.type === 'order', onlyCounted: o.onlyCounted });
  return `*${docTitle(d)}*${d.worker ? '\n' + d.worker : ''}\n\n` + lines.map(l => `• ${nm({ he: l.he, en: l.en, tr: l.tr })}${l.sku ? ' | ' + t('sku') + ' ' + l.sku : ''} — *${l.qty == null ? '—' : fmtQty(l.qty)}* ${l.unit}`).join('\n');
}
export const openWhatsApp = text => window.open('https://wa.me/?text=' + encodeURIComponent(text.slice(0, 3800)), '_blank');
