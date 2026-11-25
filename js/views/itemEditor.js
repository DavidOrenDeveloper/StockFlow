import { S, nm, saveItem, deleteItem, setImage, removeImage, imgOf } from '../store.js';
import { openModal, confirmDlg, zoomImg } from '../modal.js';
import { t, msdW } from '../i18n.js';
import { esc, resizeImage, toast } from '../util.js';
import { ic, icCam, icGal } from '../icons.js';
import { suggestEn, suggestTr, hasHebrew } from '../lexicon.js';

/** withMsd: (new item inside a stock count) shows a MSD field once the category is power tools; the number is handed to onDone(o, { msd }) and kept only in that count */
/** local: { save(o), remove(), added(o) } = the item lives ONLY inside one count/order (not in the catalog): save/remove act on that document; an optional button adds it to the catalog */
export function editItem(item, { isNew = false, onDone, withMsd = false, local = null } = {}) {
  const d = structuredClone(item); let pending = null, removeImg = false, pendUrl = '';
  let enAuto = isNew || !d.en, trAuto = isNew || !d.tr;
  const opt = (arr, v) => arr.map(x => `<option value="${esc(x.id)}" ${x.id === v ? 'selected' : ''}>${esc(nm(x, 'he'))}${x.en ? ' · ' + esc(x.en) : ''}</option>`).join('');
  const m = openModal({
    title: local ? (S.cfg.lang === 'he' ? 'עריכת פריט (רק בספירה/הזמנה)' : 'Edit item (this document only)') : isNew ? t('add_item') : t('edit_item'), wide: true,
    content: `<div class="ie">
      <div class="ie-img"><button class="imgbox" data-zoom type="button">${imgOf(d) ? `<img src="${imgOf(d)}">` : ic('image', 36)}</button>
        <div class="btnrow"><button class="btn sm" data-cam type="button">${icCam(18)} ${esc(S.cfg.lang === 'he' ? 'צלם' : 'Camera')}</button><button class="btn sm" data-pick type="button">${icGal(18)} ${esc(S.cfg.lang === 'he' ? 'גלריה' : 'Gallery')}</button><button class="btn sm danger-o" data-rmimg type="button">${ic('trash', 16)}</button></div>
        <input type="file" accept="image/*" hidden data-file><input type="file" accept="image/*" capture="environment" hidden data-file-cam></div>
      <div class="ie-f">
        <label class="fld"><span>${esc(t('name_he'))}</span><input data-f="he" dir="rtl" value="${esc(d.he)}" autocomplete="off"></label>
        <label class="fld"><span>${esc(t('name_en'))}</span><div class="withbtn"><input data-f="en" dir="ltr" value="${esc(d.en)}" autocomplete="off"><button class="icon-btn" type="button" data-wand="en" title="${esc(t('suggest'))}">${ic('wand', 18)}</button></div></label>
        <label class="fld"><span>${esc(t('name_tr'))}</span><div class="withbtn"><input data-f="tr" dir="ltr" value="${esc(d.tr)}" autocomplete="off" style="text-transform:uppercase"><button class="icon-btn" type="button" data-wand="tr" title="${esc(t('suggest'))}">${ic('wand', 18)}</button></div></label>
        <div><label class="fld"><span>${esc(t('sku'))}</span><input data-f="sku" dir="ltr" inputmode="text" value="${esc(d.sku)}" placeholder="${esc(t('sku_ph'))}" autocomplete="off"></label>
        </div>
        <div class="two"><label class="fld"><span>${esc(t('category'))}</span><select data-f="cat">${opt(S.cats, d.cat)}</select></label>
        <label class="fld"><span>${esc(t('unit'))}</span><select data-f="unit">${opt(S.units, d.unit)}</select></label></div>
        ${withMsd ? `<label class="fld msdf" data-msdbox hidden><span>${esc(msdW())}</span><input data-msd dir="ltr" inputmode="numeric" autocomplete="off"><small class="hint" style="margin:0">${esc(S.cfg.lang === 'he' ? 'יופיע רק בספירת המלאי הזו, לא בקטלוג.' : 'Shown only in this stock count, not in the catalog.')}</small></label>` : ''}
        <div class="fld"><span>${esc(t('synonyms_item'))}</span><div class="chips" data-chips></div><input data-syn placeholder="${esc(t('syn_ph'))}"></div>
        <label class="fld"><span>${esc(t('note'))}</span><input data-f="note" value="${esc(d.note || '')}"></label>
        ${local ? `<div class="localbox"><p class="hint" style="margin:0 0 6px">${esc(S.cfg.lang === 'he' ? 'הפריט נשמר רק במסמך הזה ולא יופיע בקטלוג הראשי. אפשר להוסיף אותו לקטלוג רק אם תבחר:' : 'This item is kept only in this document, not in the main catalog. Add it to the catalog only if you choose to:')}</p><button class="btn" type="button" data-addcat>${ic('plus', 16)} ${esc(S.cfg.lang === 'he' ? 'הוסף גם לקטלוג' : 'Also add to catalog')}</button></div>` : ''}
      </div></div>`,
    actions: `${isNew ? '' : `<button class="btn danger-o" data-del>${ic('trash', 16)} ${esc(local ? (S.cfg.lang === 'he' ? 'הסר מהמסמך' : 'Remove from document') : t('delete'))}</button>`}<span class="grow"></span><button class="btn" data-no>${esc(t('cancel'))}</button><button class="btn primary" data-save>${esc(t('save'))}</button>`
  });
  const F = k => m.$(`[data-f="${k}"]`);
  const drawChips = () => { m.$('[data-chips]').innerHTML = d.syn.map((s, i) => `<span class="chip">${esc(s)}<button type="button" data-rm="${i}">×</button></span>`).join(''); m.$$('[data-rm]').forEach(b => b.onclick = () => { d.syn.splice(+b.dataset.rm, 1); drawChips(); }); };
  drawChips();
  const addSyn = () => { const i = m.$('[data-syn]'); i.value.split(/[,،;\n]/).map(s => s.trim()).filter(Boolean).forEach(s => { if (!d.syn.includes(s)) d.syn.push(s); }); i.value = ''; drawChips(); };
  m.$('[data-syn]').onkeydown = e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSyn(); } }; m.$('[data-syn]').onblur = addSyn;
  const tog = () => { const b = m.$('[data-msdbox]'); if (b) { b.hidden = F('cat').value !== 'c_etools'; if (!b.hidden && isNew) setTimeout(() => m.$('[data-msd]').focus(), 60); } }; F('cat').onchange = tog; tog();
  const he = F('he'), en = F('en'), tr = F('tr');
  he.oninput = () => { if (enAuto) en.value = hasHebrew(he.value) ? suggestEn(he.value) : he.value; if (trAuto) tr.value = hasHebrew(he.value) ? suggestTr(he.value) : he.value.toUpperCase(); };
  en.oninput = () => { enAuto = false; }; tr.oninput = () => { trAuto = false; };
  m.$$('[data-wand]').forEach(b => b.onclick = () => { const k = b.dataset.wand; F(k).value = k === 'en' ? suggestEn(he.value) : suggestTr(he.value); if (k === 'en') enAuto = false; else trAuto = false; });
  const refreshImg = () => { const u = pendUrl || (removeImg ? '' : imgOf(d)); m.$('.imgbox').innerHTML = u ? `<img src="${u}">` : ic('image', 36); return u; };
  m.$('[data-pick]').onclick = () => m.$('[data-file]').click();
  m.$('[data-cam]').onclick = () => m.$('[data-file-cam]').click();
  const onFile = async e => { const f = e.target.files[0]; if (!f) return; try { pending = await resizeImage(f); pendUrl = URL.createObjectURL(pending); removeImg = false; refreshImg(); } catch { toast(t('error')); } e.target.value = ''; };
  m.$('[data-file]').onchange = onFile; m.$('[data-file-cam]').onchange = onFile;
  m.$('[data-rmimg]').onclick = () => { pending = null; pendUrl = ''; removeImg = true; refreshImg(); };
  m.$('[data-zoom]').onclick = () => zoomImg(refreshImg(), he.value);
  m.$('[data-no]').onclick = () => m.close();
  if (local) m.$('.ie-img')?.setAttribute('hidden', '');   // photos are only for catalog items
  if (!isNew) m.$('[data-del]').onclick = local ? async () => { if (await confirmDlg(S.cfg.lang === 'he' ? `להסיר את "${item.he}" מהמסמך הזה?` : `Remove "${item.he}" from this document?`, { danger: true, ok: S.cfg.lang === 'he' ? 'הסר' : 'Remove' })) { await local.remove(); m.close(); onDone && onDone(); } } : async () => { if (await confirmDlg(t('confirm_delete_item', { n: item.he }), { danger: true, ok: t('delete') })) { await deleteItem(item.id); m.close(); toast(t('deleted')); onDone && onDone(); } };
  m.$('[data-save]').onclick = async () => {
    addSyn();
    const o = { ...d, he: he.value.trim(), en: en.value.trim(), tr: tr.value.trim(), sku: F('sku').value.trim(), cat: F('cat').value, unit: F('unit').value, note: F('note').value.trim() };
    if (!o.he && !o.en) { he.focus(); he.classList.add('err'); return; }
    if (o.sku) { const dup = S.items.find(i => i.sku === o.sku && i.id !== o.id); if (dup && !(await confirmDlg(t('dup_sku', { n: dup.he })))) return; }
    if (local) { await local.save(o); m.close(); toast(t('saved')); onDone && onDone(o); return; }
    if (pending) await setImage(o, pending); else if (removeImg) await removeImage(o);
    const msd = withMsd && o.cat === 'c_etools' ? (m.$('[data-msd]')?.value || '').trim() : '';
    await saveItem(o); m.close(); toast(t('saved')); onDone && onDone(o, { msd });
  };
  if (local) m.$('[data-addcat]').onclick = async () => {
    addSyn(); const o = { ...d, he: he.value.trim(), en: en.value.trim(), tr: tr.value.trim(), sku: F('sku').value.trim(), cat: F('cat').value, unit: F('unit').value, note: F('note').value.trim() };
    if (!o.he && !o.en) { he.focus(); he.classList.add('err'); return; }
    await local.save(o); await saveItem(o); m.close(); toast(S.cfg.lang === 'he' ? 'הפריט נוסף גם לקטלוג' : 'Item also added to the catalog'); onDone && onDone(o);
  };
  if (isNew && d.he) he.oninput();
  if (isNew) setTimeout(() => he.focus(), 80);   // no auto-keyboard when just opening an existing item: one Back press closes it
}
