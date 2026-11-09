// Builds data/seed.json from the extracted spreadsheet rows (run once; output is committed).
import fs from 'fs';
import { suggestEn, suggestTr } from '../js/lexicon.js';
const raw = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const CATS = [
  ['c_wire', 'חוטים/כבלים', 'חוטים וכבלים', 'Wires & cables', 'CHUTIM VE-KVALIM'], ['c_conduit', 'צינורות', 'צינורות', 'Conduits', 'TZINOROT'],
  ['c_acc', 'אביזרים', 'אביזרים', 'Wiring accessories', 'AVIZARIM'], ['c_box', 'קופסאות', 'קופסאות', 'Boxes', 'KUPSAOT'],
  ['c_hang', 'תליה ובטיחות', 'תליה ובטיחות', 'Hanging & safety', 'TLIYA VE-BETICHUT'], ['c_screw', 'ברגים', 'ברגים', 'Screws & fixings', 'BRAGIM'],
  ['c_trunk', 'תעלות וזרועות', 'תעלות וזרועות', 'Trunking & arms', 'TAALOT VE-ZROOT'], ['c_cons', 'חומרים מתכלים', 'חומרים מתכלים', 'Consumables', 'CHOMRIM MITKALIM'],
  ['c_tools', 'כלי עבודה', 'כלי עבודה', 'Tools', 'KLEI AVODA'], ['c_board', 'לוח חשמל', 'לוח חשמל', 'Distribution board', 'LUACH CHASHMAL']
];
const catId = Object.fromEntries(CATS.map(c => [c[1], c[0]]));
const PREFIX = { c_wire: ['Wire', 'CHUT'], c_conduit: ['Conduit', 'TZINOR'], c_board: ['MCB', 'MAZ'] };
const needsPrefix = (cid, he) => (cid === 'c_wire' && /^(\d|חום|כחול|צהוב)/.test(he)) || (cid === 'c_conduit' && /^(ירוק|צהוב|אדום|לבן|חום|כחול)/.test(he)) || (cid === 'c_board' && /^\d/.test(he));
const OVERRIDE = { 'פס RST': ['Busbar RST', 'PAS RST'], 'פחת 4X40': ['RCD 4X40', 'PACHAT 4X40'], 'פחת 4X80': ['RCD 4X80', 'PACHAT 4X80'] };
const unitFor = he => /איזולירבנד/.test(he) ? 'u_roll' : /כפפות/.test(he) ? 'u_pair' : 'u_unit';
const items = raw.map((r, n) => {
  const cid = catId[r.cat];
  const pre = needsPrefix(cid, r.he) ? PREFIX[cid] : null;
  const ov = (cid === 'c_board' && OVERRIDE[r.he]) || null;
  return { id: r.id, sku: r.sku || '', he: r.he, en: ov ? ov[0] : suggestEn(r.he, pre), tr: ov ? ov[1] : suggestTr(r.he, pre),
    cat: cid, unit: unitFor(r.he), emergency: r.emergency ?? null, syn: [], img: r.img, note: '', order: n + 1 };
});
const seed = {
  v: 1,
  categories: CATS.map(c => ({ id: c[0], he: c[2], en: c[3], tr: c[4] })),
  units: [
    { id: 'u_unit', he: 'יחידה', en: 'Unit', tr: 'YECHIDA' }, { id: 'u_meter', he: 'מטר', en: 'Meter', tr: 'METER' },
    { id: 'u_box', he: 'קופסה', en: 'Box', tr: 'KUPSA' }, { id: 'u_roll', he: 'גליל', en: 'Roll', tr: 'GALIL' },
    { id: 'u_pack', he: 'חבילה', en: 'Pack', tr: 'CHAVILA' }, { id: 'u_pair', he: 'זוג', en: 'Pair', tr: 'ZUG' },
    { id: 'u_set', he: 'סט', en: 'Set', tr: 'SET' }, { id: 'u_kg', he: 'ק"ג', en: 'Kg', tr: 'KG' }
  ],
  sites: [{ id: 's_main', he: 'מחסן ראשי', en: 'Main warehouse', tr: 'MACHSAN RASHI' }, { id: 's_site', he: 'אתר', en: 'Site', tr: 'ATAR' }],
  folders: [{ id: 'f_orders', name: 'הזמנות', type: 'order' }, { id: 'f_counts', name: 'ספירות מלאי', type: 'count' }],
  synonyms: [
    ['שקע', 'סוקט', 'socket', 'sheka'], ['תקע', 'פלאג', 'plug', 'teka'], ['מפסק', 'מתג', 'switch'], ['אזיקון', 'אזיקונים', 'cable tie', 'zip tie'],
    ['קופסה', 'קופסא', 'קופ', 'box'], ['צינור', 'צנרת', 'conduit', 'pipe'], ['תעלה', 'מובל', 'trunking'], ['בורג', 'ברגים', 'screw'],
    ['דיבל', 'דיבלים', 'dowel', 'wall plug', 'anchor'], ['איזולירבנד', 'סרט בידוד', 'סרט חשמל', 'insulation tape'],
    ['מקדח', 'drill bit'], ['מפתח', 'מפתח שוודי', 'wrench', 'spanner'], ['פחת', 'rcd', 'ממסר פחת'], ['מהדק', 'קלאמפ', 'clamp']
  ].map((w, i) => ({ id: 'g' + (i + 1), words: w }))
};
fs.writeFileSync('data/seed.json', JSON.stringify({ ...seed, items }));
console.log(items.length, 'items;', items.filter(i => i.sku).length, 'with SKU');
