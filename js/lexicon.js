// Hebrew -> English / Latin-letter helpers. Used for first-fill suggestions only; every result stays editable.
const NIQQUD = /[\u0591-\u05C7]/g;
const clean = s => String(s || '').replace(NIQQUD, '').replace(/[״“”]/g, '"').replace(/[׳‘’]/g, "'").replace(/\s+/g, ' ').trim();

// word -> [English, Latin letters as people read it]
export const WORDS = {
  'שקע': ['Socket', 'SHEKA'], 'תקע': ['Plug', 'TEKA'], 'כבל': ['Cable', 'KEVEL'], 'חוט': ['Wire', 'CHUT'],
  'גמיש': ['Flexible', 'GAMISH'], 'קוברה': ['Cobra conduit', 'KOBRA'], 'שרשורי': ['Corrugated conduit', 'SHARSHURI'],
  'מופה': ['Coupler', 'MUFA'], 'קופסה': ['Box', 'KUPSA'], "קופ'": ['Box', 'KUPSA'], 'קופ': ['Box', 'KUPSA'],
  'בטון': ['Concrete', 'BETON'], 'גבס': ['Drywall', 'GEVES'], 'שוודית': ['Swedish', 'SHVEDIT'], 'פנדל': ['Pendant holder', 'PENDEL'],
  'אזיקון': ['Cable tie', 'AZIKON'], 'שלה': ['Pipe clip', 'SHELA'], 'מרחק': ['Spacer', 'MERCHAK'],
  'שרשרת': ['Chain', 'SHARSHERET'], 'תליה': ['hanging', 'TLIYA'], 'מהדק': ['Clamp', 'MEHADEK'], 'פרופיל': ['Profile', 'PROFIL'],
  'מהיר': ['quick', 'MAHIR'], 'פס': ['Bar', 'PAS'], 'חגורת': ['Harness', 'CHAGORAT'], 'בטיחות': ['safety', 'BETICHUT'],
  'חבל': ['Rope', 'CHEVEL'], 'מסיכה': ['Mask', 'MASECHA'], 'ווקי': ['Walkie', 'WOKI'], 'טוקי': ['talkie', 'TOKI'],
  'בורג': ['Screw', 'BORG'], 'קודח': ['self-drilling', 'KODEACH'], 'פחפח': ['sheet-metal', 'PACHPACH'], 'לא': ['non', 'LO'],
  'דיבל': ['Dowel', 'DIBEL'], 'דפיקה': ['hammer-in', 'DFIKA'], 'חורץ': ['slotted', 'CHORETZ'], 'סיבית': ['bit-drive', 'SIVIT'],
  'קנדי': ['Canadian clamp', 'KANADI'], 'מחבר': ['Connector', 'MECHABER'], 'תעלה': ['Trunking', 'TAALA'], 'זרוע': ['Support arm', 'ZROA'],
  'רזוע': ['Support arm', 'ZROA'], 'פרפר': ['butterfly', 'PARPAR'], 'איזולירבנד': ['Insulation tape', 'IZOLIRBAND'],
  'חבלנים': ['Chavlanim', 'CHAVLANIM'], 'משיחה': ['pull cord', 'MESHICHA'], 'כפפות': ['Gloves', 'KFAFOT'], 'להב': ['Blade', 'LEHAV'],
  'סכין': ['Knife', 'SAKIN'], 'יפני': ['utility', 'YAPANI'], 'לוח': ['Board', 'LUACH'], 'זמני': ['temporary', 'ZMANI'],
  'קטן': ['small', 'KATAN'], 'גדול': ['large', 'GADOL'], "ג'ל": ['Gel', 'JEL'], 'השחלה': ['pulling', 'HASHCHALA'],
  'מפצל': ['Splitter', 'MEFATZEL'], 'פחת': ['RCD', 'PACHAT'], 'נורת': ['Bulb', 'NURAT'], 'ליבון': ['incandescent', 'LIBUN'],
  'פאנל': ['Panel', 'PANEL'], 'מתאם': ['Adapter', 'MATEM'], 'מחיצה': ['Divider', 'MECHITZA'], 'מפסק': ['Switch', 'MEFSAK'],
  'יחיד': ['single', 'YACHID'], 'מחליף': ['two-way', 'MACHLIF'], 'לחצן': ['Push button', 'LACHTZAN'], 'מדרגות': ['stairs', 'MADREGOT'],
  'מסגרת': ['Frame', 'MISGERET'], 'תקשורת': ['data', 'TIKSHORET'], 'כח': ['power', 'KOACH'], 'כוח': ['power', 'KOACH'],
  'דיסק': ['Disc', 'DISK'], 'תיק': ['Bag', 'TIK'], 'עבודה': ['work', 'AVODA'], 'סרט': ['Strap', 'SERET'], 'ברזל': ['steel', 'BARZEL'],
  'מחורץ': ['perforated', 'MECHORATZ'], 'יהלום': ['diamond', 'YAHALOM'], 'מקדח': ['Drill bit', 'MAKDEACH'], 'מפתח': ['Wrench', 'MAFTEACH'],
  'בוקסה': ['Socket wrench', 'BOKSA'], 'מטר': ['Tape measure', 'METER'], 'ג"ת': ['Light fixture', 'GAT'], 'מגולוון': ['galvanized', 'MEGALVAN'],
  'ראש': ['head', 'ROSH'], 'צינור': ['Pipe', 'TZINOR'], 'מרירון': ['Meriron', 'MERIRON'], 'זווית': ['Angle', 'ZAVIT'], 'רון': ['Ron', 'RON'],
  'ספרי': ['Speri', 'SPERI'], 'בלה': ['Bela', 'BELA'], 'סומסום': ['Sumsum', 'SUMSUM'], 'פלטא': ['Plata', 'PLATA'], 'פאקט': ['Paket', 'PAKET'],
  'מ"מ': ['mm', 'MM'],
  // colours
  'אדום': ['Red', 'ADOM'], 'ירוק': ['Green', 'YAROK'], 'כחול': ['Blue', 'KACHOL'], 'לבן': ['White', 'LAVAN'], 'שחור': ['Black', 'SHACHOR'],
  'חום': ['Brown', 'CHUM'], 'צהוב': ['Yellow', 'TSAHOV'], 'כתום': ['Orange', 'KATOM'], 'עבה': ['thick', 'AVE'], 'שחור_': ['Black', 'SHACHOR']
};
// multi-word phrases first (Hebrew order -> natural English order)
const PHRASES = [
  ['חוט גמיש', 'Flexible wire', 'CHUT GAMISH'], ['לוח זמני', 'Temporary board', 'LUACH ZMANI'], ['סכין יפני', 'Utility knife', 'SAKIN YAPANI'],
  ['בורג קודח', 'Self-drilling screw', 'BORG KODEACH'], ['בורג פחפח לא קודח', 'Sheet-metal screw (non-drilling)', 'BORG PACHPACH LO KODEACH'],
  ['חוט משיחה', 'Pull cord', 'CHUT MESHICHA'], ['חוט מגולוון', 'Galvanized wire', 'CHUT MEGALVAN'], ['ג\'ל השחלה', 'Cable pulling gel', 'JEL HASHCHALA'],
  ['תיק עבודה', 'Tool bag', 'TIK AVODA'], ['חגורת בטיחות', 'Safety harness', 'CHAGORAT BETICHUT'], ['חבל בטיחות', 'Safety rope', 'CHEVEL BETICHUT'],
  ['שרשרת תליה', 'Hanging chain', 'SHARSHERET TLIYA'], ['לחצן מדרגות', 'Staircase push button', 'LACHTZAN MADREGOT'], ['נורת ליבון', 'Incandescent bulb', 'NURAT LIBUN'],
  ['מתאם תקשורת', 'Data adapter', 'MATEM TIKSHORET'], ['מתאם בוקסה', 'Socket-wrench adapter', 'MATEM BOKSA'], ['שקע כח', 'Power socket', 'SHEKA KOACH'],
  ['דיסק יהלום', 'Diamond disc', 'DISK YAHALOM'], ['דיסק ברזל', 'Steel cutting disc', 'DISK BARZEL'], ['סרט ברזל', 'Steel strap', 'SERET BARZEL'],
  ['סרט מחורץ', 'Perforated strap', 'SERET MECHORATZ'], ['זד מחורץ', 'Perforated Z profile', 'ZED MECHORATZ'], ['מהדק מהיר', 'Quick clamp', 'MEHADEK MAHIR'],
  ['מהדק קנדי', 'Canadian clamp', 'MEHADEK KANADI'], ['מהדק פס', 'Bar clamp', 'MEHADEK PAS'], ['מחבר תעלה', 'Trunking connector', 'MECHABER TAALA'],
  ['שלה מרחק', 'Spacer pipe clip', 'SHELA MERCHAK'], ['איזולירבנד שחור עבה', 'Thick black insulation tape', 'IZOLIRBAND SHACHOR AVE'],
  ['צהוב ירוק', 'Yellow-green', 'TSAHOV YAROK'], ['חום כתום', 'Brown-orange', 'CHUM KATOM'], ['חום שחור', 'Brown-black', 'CHUM SHACHOR'],
  ['בורג סיבית', 'Bit-drive screw', 'BORG SIVIT'], ['בורג חורץ', 'Slotted screw', 'BORG CHORETZ'], ['דיבל דפיקה', 'Hammer-in dowel', 'DIBEL DFIKA'],
  ['שקע CEE', 'CEE socket', 'SHEKA CEE'], ['תקע CEE', 'CEE plug', 'TEKA CEE'], ['מפסק יחיד', 'Single switch', 'MEFSAK YACHID'], ['מפסק מחליף', 'Two-way switch', 'MEFSAK MACHLIF'],
  ['פאנל LED', 'LED panel', 'PANEL LED']
];
const COLORS = new Set(['Red','Green','Blue','White','Black','Brown','Yellow','Orange','Thick']);
const LETTERS = { 'א':'A','ב':'B','ג':'G','ד':'D','ה':'H','ו':'V','ז':'Z','ח':'CH','ט':'T','י':'Y','כ':'K','ך':'KH','ל':'L','מ':'M','ם':'M','נ':'N','ן':'N','ס':'S','ע':'A','פ':'P','ף':'F','צ':'TZ','ץ':'TZ','ק':'K','ר':'R','ש':'SH','ת':'T' };
const spell = w => w.split('').map(c => LETTERS[c] ?? c).join('').toUpperCase();
const isHeb = s => /[\u05D0-\u05EA]/.test(s);
const tokens = s => clean(s).split(' ').filter(Boolean);

function convert(he, idx, ctxPrefix) {
  let s = clean(he).replace(/([\u05D0-\u05EA])(\d)/g, '$1 $2');
  // "3 מקום" -> gang
  s = s.replace(/(\d+)\s*מקום/g, (_, n) => `§G${n}§`);
  const out = [];
  const parts = s.split(' ');
  for (let i = 0; i < parts.length; i++) {
    let done = false;
    for (let len = Math.min(4, parts.length - i); len >= 2 && !done; len--) {
      const chunk = parts.slice(i, i + len).join(' ');
      const p = PHRASES.find(p => p[0] === chunk);
      if (p) { out.push(p[idx]); i += len - 1; done = true; }
    }
    if (done) continue;
    const w = parts[i];
    const g = w.match(/^§G(\d+)§$/);
    if (g) { out.push(idx === 1 ? `${g[1]}-gang` : `${g[1]} MAKOM`); continue; }
    if (WORDS[w]) out.push(WORDS[w][idx - 1]);
    else if (isHeb(w)) out.push(idx === 1 ? spell(w) : spell(w));
    else out.push(w);
  }
  if (idx === 1 && out.length > 1) { // "socket blue" -> "Blue socket"
    const ci = out.findIndex((w, k) => k > 0 && COLORS.has(w.split('-')[0]));
    if (ci > 0 && !/\d/.test(out.slice(0, ci).join(''))) { const c = out.splice(ci, 1)[0]; out[0] = out[0].charAt(0).toLowerCase() + out[0].slice(1); out.unshift(c); }
  }
  let r = out.join(' ').replace(/\s+/g, ' ').trim();
  if (idx === 1) r = r.charAt(0).toUpperCase() + r.slice(1);
  if (ctxPrefix) r = ctxPrefix[idx - 1] + ' ' + r;
  return r;
}
export const suggestEn = (he, ctxPrefix) => convert(he, 1, ctxPrefix);
export const suggestTr = (he, ctxPrefix) => convert(he, 2, ctxPrefix);
export const hasHebrew = isHeb;
