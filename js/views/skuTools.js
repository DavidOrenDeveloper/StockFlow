// SKU tools: (1) match catalog items to Shapir SKUs with user approval, (2) add / remove items from the Shapir catalog.
import { S, nm, imgOf, saveItem, newItem, deleteItem, setImage } from '../store.js';
import { norm } from '../search.js';
import { esc, toast, debounce } from '../util.js';
import { confirmDlg } from '../modal.js';
import { ic } from '../icons.js';

const L = (he, en) => (S.cfg.lang === 'he' ? he : en);
const tokens = s => new Set(norm(s).split(' ').filter(Boolean));
const w = k => (/\d/.test(k) ? 2 : 1);
let CAT = null;
async function load() {
  if (!CAT) { const j = await (await fetch('data/shapir.json')).json(); CAT = j.items.map(([sku, name, unit, img]) => ({ sku, name, unit, img, tk: tokens(name), key: sku + '|' + name })); }
  return CAT;
}
function score(a, b) {
  let wa = 0, wb = 0, inter = 0;
  a.forEach(k => { wa += w(k); }); b.forEach(k => { wb += w(k); });
  a.forEach(k => { if (b.has(k)) inter += w(k); else if (k.length >= 3 && [...b].some(x => x.length >= 3 && (x.startsWith(k) || k.startsWith(x)))) inter += 0.6 * w(k); });
  return wa && wb ? inter / Math.sqrt(wa * wb) : 0;
}
const CATS = [[/חוט|כבל|מוליך/, 'c_wire'], [/צינור|שלה|קוברה|מריכף/, 'c_conduit'], [/קופס/, 'c_box'], [/בורג|דיבל|עוגן|אום|דסקית|מסמר/, 'c_screw'], [/תעלה|זרוע|סולם/, 'c_trunk'], [/מאמ|פחת|לוח|ח"א|מגען/, 'c_board'], [/שקע|מפסק|תקע|VIMAR|ARKE|מסגרת|מתאם/i, 'c_acc'], [/אזיקון|סרט|אלקטרוד|סיבית|מסיכ|כפפ|אוזני/, 'c_cons'], [/מקדח|מברג|פטיש|מלחם|סולם|מפתח|להב|מסור/, 'c_tools'], [/מתלה|תליה|קולר|מהדק|רצועה/, 'c_hang']];
const guessCat = n => (CATS.find(([re]) => re.test(n)) || [0, S.cats.find(c => c.id === 'c_acc')?.id || S.cats[0]?.id])[1];

export function render(root) {
  let tab = 'match', showAll = false, shown = 15, q = '', adShown = 40;
  const skipped = new Set(), undo = [];   // undo = last SKU changes made on this page
  root.innerHTML = `<div class="page"><div class="bar"><b>${esc(L('מק"טי שפיר', 'Shapir SKUs'))}</b></div>
    <div class="chips-row"><button class="pill" data-t="match"></button><button class="pill" data-t="add"></button></div><div id="body"><div class="spinner"></div></div></div>`;
  const $ = s => root.querySelector(s);
  const missing = () => S.items.filter(i => !String(i.sku || '').trim());
  const added = () => S.items.filter(i => i.src === 'shapir');
  const cand = (it, k = 3) => { const a = tokens((it.he || '') + ' ' + (it.en || '')); return CAT.map(c => ({ c, s: score(a, c.tk) })).filter(x => x.s >= 0.3).sort((x, y) => y.s - x.s).slice(0, k); };
  const btn = (id, c, s) => `<button class="btn sm" style="text-align:start;white-space:normal;margin:2px 0;width:100%" data-ap="${id}|${esc(c.sku)}">${ic('check', 14)} ${esc(c.name)} · <b dir="ltr">${esc(c.sku)}</b>${s != null ? ` <small>${Math.round(s * 100)}%</small>` : ''}</button>`;

  function drawTabs() {
    root.querySelectorAll('[data-t]').forEach(b => { b.classList.toggle('on', b.dataset.t === tab); b.textContent = b.dataset.t === 'match' ? `${L('התאמת מק"טים', 'Match SKUs')} (${missing().length})` : `${L('קטלוג שפיר', 'Shapir catalog')} (${added().length})`; });
  }
  function drawMatch() {
    const list = (showAll ? S.items : missing()).filter(i => !skipped.has(i.id));
    const cards = list.slice(0, shown).map(it => {
      const has = String(it.sku || '').trim(), u = imgOf(it);
      return `<div class="card" style="padding:10px;margin:8px 0" data-id="${it.id}"><div style="display:flex;gap:10px;align-items:center">${u ? `<img src="${u}" style="width:52px;height:52px;object-fit:contain">` : ''}
        <div style="flex:1"><b>${esc(nm(it))}</b><br><small>${has ? `${esc(L('מק"ט', 'SKU'))}: <b dir="ltr">${esc(has)}</b>` : esc(L('ללא מק"ט', 'No SKU'))}</small></div></div>
        ${has ? '' : cand(it).map(x => btn(it.id, x.c, x.s)).join('') || `<small>${esc(L('לא נמצאה התאמה אוטומטית', 'No automatic match'))}</small>`}
        <div style="display:flex;gap:6px;margin-top:6px"><input class="srch" placeholder="${esc(L('חפש בקטלוג שפיר…', 'Search Shapir…'))}" style="flex:1"><input class="man" placeholder="${esc(L('מק"ט ידני', 'Manual SKU'))}" dir="ltr" style="width:34%"><button class="btn sm" data-man="${it.id}">${ic('edit', 14)}</button></div>
        <div class="res"></div><div style="margin-top:4px">${has ? `<button class="btn sm" data-clr="${it.id}">${esc(L('נקה מק"ט', 'Clear SKU'))}</button>` : `<button class="btn sm" data-skip="${it.id}">${esc(L('דלג', 'Skip'))}</button>`}</div></div>`;
    }).join('');
    const lu = undo[undo.length - 1], luIt = lu && S.byId.get(lu.id);
    $('#body').innerHTML = `${luIt ? `<button class="btn sm" data-undo style="margin:6px 0;width:100%">↶ ${esc(L('בטל', 'Undo'))}: ${esc(nm(luIt))} · ${esc(luIt.sku ? L('מק"ט', 'SKU') + ' ' + luIt.sku : L('נוקה המק"ט', 'SKU cleared'))}</button>` : ''}<div class="chips-row"><button class="pill ${showAll ? '' : 'on'}" data-f="miss">${esc(L('ללא מק"ט', 'Without SKU'))}</button><button class="pill ${showAll ? 'on' : ''}" data-f="all">${esc(L('כל הפריטים (עריכה)', 'All items (edit)'))}</button></div>
      <p class="hint">${esc(L('כאן משייכים מק"ט שפיר לפריטים שלך שעדיין בלי מק"ט. מתחת לכל פריט מוצעים עד 3 פריטים מקטלוג שפיר, לפי הדמיון בין המילים והמספרים בשם (האחוז מראה כמה דומה). לחיצה על הצעה שומרת את המק"ט מיד. אם טעית – לחץ "בטל" למעלה. אפשר גם לחפש בקטלוג שפיר, להקליד מק"ט ידנית, או לדלג.', 'Here you give your items without a SKU a Shapir SKU. Under each item up to 3 Shapir items are suggested by how similar the words and numbers in the names are (the % shows how close). Tapping a suggestion saves the SKU immediately; if you tapped by mistake press "Undo" at the top. You can also search Shapir, type a SKU manually, or skip.'))}</p>${cards || `<div class="empty"><p>${esc(L('אין פריטים להצגה', 'Nothing to show'))}</p></div>`}${list.length > shown ? `<button class="btn" data-more>${esc(L('עוד', 'More'))} (${list.length - shown})</button>` : ''}`;
  }
  function drawAdd() {
    const ad = added(), have = new Set(ad.map(i => i.srcKey));
    const res = q ? CAT.filter(c => { const k = tokens(q); return [...k].every(x => [...c.tk].some(y => y.includes(x)) || c.sku.includes(x)); }).slice(0, 40) : [];
    $('#body').innerHTML = `<div class="bar tight"><div class="searchbox">${ic('search', 18)}<input id="aq" type="search" value="${esc(q)}" placeholder="${esc(L('חפש פריט או מק"ט בקטלוג שפיר…', 'Search Shapir name or SKU…'))}"></div></div>
      ${res.map(c => `<div class="card" style="padding:8px 10px;margin:6px 0;display:flex;gap:8px;align-items:center">${c.img ? `<img src="data/img/${c.img}.webp" loading="lazy" style="width:44px;height:44px;object-fit:contain">` : ''}<div style="flex:1">${esc(c.name)}<br><small dir="ltr">${esc(c.sku)}</small></div>${have.has(c.key) ? `<span class="tag">${esc(L('נוסף', 'Added'))}</span>` : `<button class="btn sm primary" data-add="${esc(c.key)}">${ic('plus', 14)} ${esc(L('הוסף', 'Add'))}</button>`}</div>`).join('') || (q ? `<div class="empty"><p>${esc(L('לא נמצא', 'No results'))}</p></div>` : '')}
      <h4 style="margin:14px 0 4px">${esc(L('פריטים שהוספת', 'Items you added'))} (${ad.length})</h4>
      ${ad.slice(0, adShown).map(i => `<div class="card" style="padding:8px 10px;margin:6px 0;display:flex;gap:8px;align-items:center"><div style="flex:1">${esc(nm(i))}<br><small dir="ltr">${esc(i.sku)}</small></div><button class="btn sm" data-del="${i.id}">${esc(L('הסר', 'Remove'))}</button></div>`).join('')}
      ${ad.length > adShown ? `<button class="btn" data-adm>${esc(L('עוד', 'More'))} (${ad.length - adShown})</button>` : ''}
      ${ad.length > 1 ? `<button class="btn" data-delall>${esc(L('הסר את כל הפריטים שהוספתי', 'Remove all added items'))}</button>` : ''}`;
    const inp = $('#aq'); if (inp) { inp.oninput = debounce(() => { q = inp.value; drawAdd(); const n = $('#aq'); n.focus(); n.setSelectionRange(q.length, q.length); }, 250); }
  }
  const draw = () => { drawTabs(); tab === 'match' ? drawMatch() : drawAdd(); };
  async function approve(id, sku) { const it = S.byId.get(id); if (!it) return; undo.push({ id, prev: it.sku || '' }); it.sku = sku; await saveItem(it); toast(L('המק"ט עודכן', 'SKU updated')); draw(); }

  root.onclick = async e => {
    const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
    if (d.t) { tab = d.t; draw(); }
    else if (d.f) { showAll = d.f === 'all'; shown = 15; draw(); }
    else if (d.more !== undefined) { shown += 15; draw(); }
    else if (d.adm !== undefined) { adShown += 40; drawAdd(); }
    else if (d.ap) { const [id, sku] = d.ap.split('|'); approve(id, sku); }
    else if (d.man) { const v = b.closest('.card').querySelector('.man').value.trim(); if (v) approve(d.man, v); }
    else if (d.skip) { skipped.add(d.skip); draw(); }
    else if (d.clr) { const it = S.byId.get(d.clr); if (it) { undo.push({ id: it.id, prev: it.sku || '' }); it.sku = ''; await saveItem(it); draw(); } }
    else if (d.undo !== undefined) { const u = undo.pop(); const it = u && S.byId.get(u.id); if (it) { it.sku = u.prev; await saveItem(it); toast(L('הפעולה בוטלה', 'Undone')); } draw(); }
    else if (d.add) {
      const c = CAT.find(x => x.key === d.add); if (!c) return;
      const it = newItem(); Object.assign(it, { sku: c.sku, he: c.name, cat: guessCat(c.name), unit: S.units.find(u => u.id === c.unit) ? c.unit : it.unit, src: 'shapir', srcKey: c.key });
      if (c.img) { try { await setImage(it, await (await fetch(`data/img/${c.img}.webp`)).blob()); } catch (err) { /* no image offline */ } }
      await saveItem(it); toast(L('נוסף לקטלוג', 'Added')); drawAdd(); drawTabs();
    }
    else if (d.del) { await deleteItem(d.del); drawAdd(); drawTabs(); }
    else if (d.delall !== undefined) { if (await confirmDlg(L('להסיר את כל הפריטים שהוספת מקטלוג שפיר? הפריטים המקוריים לא ייפגעו.', 'Remove all items added from the Shapir catalog? Original items are untouched.'), { danger: true })) { for (const i of added()) await deleteItem(i.id); drawAdd(); drawTabs(); } }
  };
  root.oninput = debounce(e => {
    if (!e.target.classList.contains('srch')) return;
    const card = e.target.closest('.card'), id = card.dataset.id, k = tokens(e.target.value);
    card.querySelector('.res').innerHTML = k.size ? CAT.filter(c => [...k].every(x => [...c.tk].some(y => y.includes(x)) || c.sku.includes(x))).slice(0, 6).map(c => btn(id, c)).join('') : '';
  }, 200);
  load().then(draw).catch(() => { $('#body').innerHTML = `<div class="empty"><p>${esc(L('לא ניתן לטעון את קטלוג שפיר', 'Could not load the Shapir catalog'))}</p></div>`; });
  return () => { root.onclick = null; root.oninput = null; };
}
