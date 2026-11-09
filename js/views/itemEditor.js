import { S, nm, saveItem, deleteItem, setImage, removeImage, imgOf, catOf } from '../store.js';
import { openModal, confirmDlg, zoomImg } from '../modal.js';
import { t } from '../i18n.js';
import { esc, resizeImage, num, toast } from '../util.js';
import { ic } from '../icons.js';
import { suggestEn, suggestTr, hasHebrew } from '../lexicon.js';

export function editItem(item, { isNew = false, onDone } = {}) {
  const d = structuredClone(item); let pending = null, removeImg = false, pendUrl = '';
  let enAuto = isNew || !d.en, trAuto = isNew || !d.tr;
  const opt = (arr, v) => arr.map(x => `<option value="${esc(x.id)}" ${x.id === v ? 'selected' : ''}>${esc(nm(x, 'he'))}${x.en ? ' · ' + esc(x.en) : ''}</option>`).join('');
  const m = openModal({
    title: isNew ? t('add_item') : t('edit_item'), wide: true,
    content: `<div class="ie">
      <div class="ie-img"><button class="imgbox" data-zoom type="button">${imgOf(d) ? `<img src="${imgOf(d)}">` : ic('image', 36)}</button>
        <div class="btnrow"><button class="btn sm" data-pick type="button">${ic('image', 16)} ${esc(t('photo'))}</button><button class="btn sm danger-o" data-rmimg type="button">${ic('trash', 16)}</button></div>
        <input type="file" accept="image/*" hidden data-file></div>
      <div class="ie-f">
        <label class="fld"><span>${esc(t('name_he'))}</span><input data-f="he" dir="rtl" value="${esc(d.he)}" autocomplete="off"></label>
        <label class="fld"><span>${esc(t('name_en'))}</span><div class="withbtn"><input data-f="en" dir="ltr" value="${esc(d.en)}" autocomplete="off"><button class="icon-btn" type="button" data-wand="en" title="${esc(t('suggest'))}">${ic('wand', 18)}</button></div></label>
        <label class="fld"><span>${esc(t('name_tr'))}</span><div class="withbtn"><input data-f="tr" dir="ltr" value="${esc(d.tr)}" autocomplete="off" style="text-transform:uppercase"><button class="icon-btn" type="button" data-wand="tr" title="${esc(t('suggest'))}">${ic('wand', 18)}</button></div></label>
        <div class="two"><label class="fld"><span>${esc(t('sku'))}</span><input data-f="sku" dir="ltr" inputmode="text" value="${esc(d.sku)}" placeholder="${esc(t('sku_ph'))}" autocomplete="off"></label>
        <label class="fld"><span>${esc(t('emergency'))}</span><input data-f="emergency" dir="ltr" inputmode="decimal" value="${d.emergency ?? ''}" autocomplete="off"><small class="hint">${esc(S.cfg.lang === 'he' ? 'אופציונלי. הכמות שמתחתיה הפריט נחשב חסר: בספירה הוא מסומן באדום ואפשר לסנן "מתחת למינימום", ובכפתור "צור הזמנה מהספירה" יוזמן ההפרש עד המינימום. ריק = הפריט לא משתתף בזה.' : 'Optional. Below this quantity the item counts as short: it is marked red in counts, can be filtered, and "Create order from count" orders the difference up to this level. Empty = not used.')}</small></label></div>
        <div class="two"><label class="fld"><span>${esc(t('category'))}</span><select data-f="cat">${opt(S.cats, d.cat)}</select></label>
        <label class="fld"><span>${esc(t('unit'))}</span><select data-f="unit">${opt(S.units, d.unit)}</select></label></div>
        <div class="fld"><span>${esc(t('synonyms_item'))}</span><div class="chips" data-chips></div><input data-syn placeholder="${esc(t('syn_ph'))}"></div>
        <label class="fld"><span>${esc(t('note'))}</span><input data-f="note" value="${esc(d.note || '')}"></label>
      </div></div>`,
    actions: `${isNew ? '' : `<button class="btn danger-o" data-del>${ic('trash', 16)} ${esc(t('delete'))}</button>`}<span class="grow"></span><button class="btn" data-no>${esc(t('cancel'))}</button><button class="btn primary" data-save>${esc(t('save'))}</button>`
  });
  const F = k => m.$(`[data-f="${k}"]`);
  const drawChips = () => { m.$('[data-chips]').innerHTML = d.syn.map((s, i) => `<span class="chip">${esc(s)}<button type="button" data-rm="${i}">×</button></span>`).join(''); m.$$('[data-rm]').forEach(b => b.onclick = () => { d.syn.splice(+b.dataset.rm, 1); drawChips(); }); };
  drawChips();
  const addSyn = () => { const i = m.$('[data-syn]'); i.value.split(/[,،;\n]/).map(s => s.trim()).filter(Boolean).forEach(s => { if (!d.syn.includes(s)) d.syn.push(s); }); i.value = ''; drawChips(); };
  m.$('[data-syn]').onkeydown = e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSyn(); } }; m.$('[data-syn]').onblur = addSyn;
  const he = F('he'), en = F('en'), tr = F('tr');
  he.oninput = () => { if (enAuto) en.value = hasHebrew(he.value) ? suggestEn(he.value) : he.value; if (trAuto) tr.value = hasHebrew(he.value) ? suggestTr(he.value) : he.value.toUpperCase(); };
  en.oninput = () => { enAuto = false; }; tr.oninput = () => { trAuto = false; };
  m.$$('[data-wand]').forEach(b => b.onclick = () => { const k = b.dataset.wand; F(k).value = k === 'en' ? suggestEn(he.value) : suggestTr(he.value); if (k === 'en') enAuto = false; else trAuto = false; });
  const refreshImg = () => { const u = pendUrl || (removeImg ? '' : imgOf(d)); m.$('.imgbox').innerHTML = u ? `<img src="${u}">` : ic('image', 36); return u; };
  m.$('[data-pick]').onclick = () => m.$('[data-file]').click();
  m.$('[data-file]').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { pending = await resizeImage(f); pendUrl = URL.createObjectURL(pending); removeImg = false; refreshImg(); } catch { toast(t('error')); } };
  m.$('[data-rmimg]').onclick = () => { pending = null; pendUrl = ''; removeImg = true; refreshImg(); };
  m.$('[data-zoom]').onclick = () => zoomImg(refreshImg(), he.value);
  m.$('[data-no]').onclick = () => m.close();
  if (!isNew) m.$('[data-del]').onclick = async () => { if (await confirmDlg(t('confirm_delete_item', { n: item.he }), { danger: true, ok: t('delete') })) { await deleteItem(item.id); m.close(); toast(t('deleted')); onDone && onDone(); } };
  m.$('[data-save]').onclick = async () => {
    addSyn();
    const o = { ...d, he: he.value.trim(), en: en.value.trim(), tr: tr.value.trim(), sku: F('sku').value.trim(), emergency: num(F('emergency').value), cat: F('cat').value, unit: F('unit').value, note: F('note').value.trim() };
    if (!o.he && !o.en) { he.focus(); he.classList.add('err'); return; }
    if (o.sku) { const dup = S.items.find(i => i.sku === o.sku && i.id !== o.id); if (dup && !(await confirmDlg(t('dup_sku', { n: dup.he })))) return; }
    if (pending) await setImage(o, pending); else if (removeImg) await removeImage(o);
    await saveItem(o); m.close(); toast(t('saved')); onDone && onDone(o);
  };
  setTimeout(() => he.focus(), 80);
}
