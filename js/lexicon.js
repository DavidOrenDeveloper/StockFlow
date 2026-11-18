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
const plain = w => w.split('').map(c => LETTERS[c] ?? c).join('').toUpperCase();
// Unknown word -> readable Latin letters WITH vowels (no niqqud needed): מסמרים -> MASMERYM. First consonant gets A, then E whenever 3 consonants would sit together;
// middle ו/י read as O/I, final ה as A, endings ים/ות -> YM/OT. Always editable by the user.
function spell(w) {
  if (/["״]/.test(w)) return plain(w);                       // acronyms (עה"ט, מא"ז) stay letter-by-letter
  let suf = '';
  if (w.length > 3) { if (/ים$/.test(w)) { suf = 'YM'; w = w.slice(0, -2); } else if (/ות$/.test(w)) { suf = 'OT'; w = w.slice(0, -2); } }
  const ch = [...w], tk = [];                                // token: {s: text, v: vowel/literal (breaks a consonant cluster)}
  for (let i = 0; i < ch.length; i++) {
    const c = ch[i], nx = ch[i + 1];
    if (!/[\u05D0-\u05EA]/.test(c)) { tk.push({ s: c === "'" ? '' : c.toUpperCase(), v: true }); continue; }
    if (nx === "'" && { 'ג': 'J', 'ז': 'ZH', 'צ': 'TCH', 'ת': 'T' }[c]) { tk.push({ s: { 'ג': 'J', 'ז': 'ZH', 'צ': 'TCH', 'ת': 'T' }[c] }); i++; continue; }
    if (i === 0) { if (c === 'א' || c === 'ע') { tk.push({ s: 'A', v: true }); continue; } if (c === 'ו') { tk.push({ s: 'V' }); continue; } if (c === 'י') { tk.push({ s: 'Y' }); continue; } }
    else if (c === 'ו') { if (nx === 'ו') { tk.push({ s: 'V' }); i++; } else tk.push({ s: 'O', v: true }); continue; }
    else if (c === 'י') { tk.push({ s: 'I', v: true }); continue; }
    else if (c === 'א' || c === 'ע') { tk.push({ s: '', v: true }); continue; }
    else if (c === 'ה' && i === ch.length - 1 && !suf) { tk.push({ s: 'A', v: true }); continue; }
    tk.push({ s: LETTERS[c] ?? c });
  }
  const n = tk.filter(x => !x.v).length; let k = 0, run = 0, out = '';
  tk.forEach((x, i) => {
    out += x.s;
    if (x.v) { run = 0; return; }
    k++; run++;
    const nxt = tk[i + 1];
    if (!nxt || nxt.v) return;                              // last letter, or a vowel follows anyway
    if (k === 1) { out += 'A'; run = 0; } else if ((n === 3 && k === 2) || run >= 2) { out += 'E'; run = 0; }
  });
  return out + suf;
}
// v1.7.0: more words (English only; the Latin-letter reading is generated by spell()). Prefix forms ל/ב/ו/ה are handled in convert().
const W2 = {"חשמל": "electrical", "אש": "fire", "חסין": "resistant", "ניסקו": "Nisko", "פח": "sheet metal", "תעלת": "trunking", "גילוון": "galvanizing", "חם": "hot-dip", "מודול": "module", "כבלים": "cables", "סולם": "ladder", "לכבל": "for cable", "קופסא": "box", "שרוול": "sleeve", "רשת": "mesh", "אלומיניום": "aluminium", "אלומניום": "aluminium", "מכסה": "cover", "נחושת": "copper", "לחשמל": "for electrical", "כבדה": "heavy", "כבד": "heavy", "בסיס": "base", "קשיח": "rigid", "זוג": "pair", "פלנה": "Plana", "נעל": "lug", "לחוט": "for wire", "מים": "water", "קלה": "light", "קל": "light", "לחץ": "pressure", "טלפון": "telephone", "מוגן": "protected", "מוגנת": "protected", "לתעלות": "for trunking", "לתעלה": "for trunking", "לתעלת": "for trunking", "ורשת": "and mesh", "סגורה": "closed", "ממ\"ר": "sq.mm", "עה\"ט": "surface-mounted", "הטיח": "plaster", "לקיר": "for wall", "ללא": "without", "דו": "double", "לפטישון": "for rotary hammer", "תקן": "standard", "הארקה": "earthing", "הרקה": "earthing", "תוף": "drum", "לבנה": "white", "פלוס": "plus", "על": "on", "מואר": "illuminated", "פלסטיק": "plastic", "פלסט": "plastic", "גיד": "core", "בזק": "Bezeq", "אפור": "grey", "צבע": "paint", "לצינור": "for pipe", "פקט": "rotary switch", "בקוטר": "diameter", "תחת": "under", "מלבנית": "rectangular", "מלבני": "rectangular", "סט": "set", "ספריי": "spray", "חביקה": "pipe clamp", "זוית": "angle", "סוויץ'": "switch", "אופיס": "office", "ללוח": "for panel", "שונים": "various", "כל": "all", "פעמון": "bell", "מחוזק": "reinforced", "דמי": "blank", "מוד'": "module", "מחורצת": "slotted", "מוט": "rod", "לקופסא": "for box", "בקופסא": "in box", "בקופ'": "in box", "לפי": "per", "ארקה": "earth", "כפול": "double", "כפולה": "double", "פיקוד": "control", "קשת": "bend", "לצנרת": "for piping", "מבודד": "insulated", "ישראלי": "Israeli", "עם": "with", "תריס": "shutter", "תאורה": "lighting", "לתאורה": "for lighting", "לגבס": "for drywall", "ס\"מ": "cm", "תומך": "support", "עומק": "depth", "הברגה": "thread", "אורך": "length", "גובה": "height", "חור": "hole", "גלוי": "exposed", "כבאים": "firefighters", "ממוספר": "numbered", "בידוד": "insulation", "גלאי": "detector", "כולל": "including", "צלב": "cross", "מגנטי": "magnetic", "שלט": "sign", "רב": "multi", "יח'": "pcs", "שייבה": "washer", "עץ": "wood", "רחב": "wide", "תלת": "three", "פאזי": "phase", "דגם": "model", "מספר": "number", "הצבעים": "colours", "פקק": "plug", "זכר": "male", "שכבתי": "layered", "לעמדת": "for station", "סימון": "marking", "אטום": "sealed", "מנענע": "shaker", "קוטבי": "pole", "דוד": "boiler", "לדוד": "for boiler", "בודד": "single", "נירוסטה": "stainless steel", "עיגון": "anchoring", "עוגן": "anchor", "שטוחה": "flat", "פי.וי.סי": "PVC", "ביט": "bit", "פלייר": "pliers", "ממסר": "relay", "שעון": "timer", "דין": "DIN", "סופית": "end terminal", "סופיות": "end terminals", "יציאה": "outlet", "לאקדח": "for gun", "מסמרים": "nails", "גילוי": "detection", "כבלי": "cable", "ספייסר": "spacer", "בכמות": "in quantity", "משתנה": "variable", "האגר": "hanger", "אמבטיה": "bathroom", "מתח": "voltage", "טסטר": "tester", "מוג\"מ": "waterproof", "מתכווץ": "heat-shrink", "מתכווצת": "heat-shrink", "כללי": "general", "זרם": "current", "מנוף": "crane", "מקט": "SKU", "למסגרת": "for frame", "מסגרות": "frames", "עגול": "round", "צד": "side", "פלטת": "plate", "מגן": "protection", "השוואה": "equalizing", "מחשב": "computer", "קופסאת": "box of", "קופסת": "box of", "גבוהה": "high", "מנעול": "lock", "לסולם": "for ladder", "שלבים": "steps", "בודק": "tester", "פיליפס": "Phillips", "כוס": "hole saw", "מדורג": "stepped", "קומפלט": "complete", "ארון": "cabinet", "עד": "up to", "רגישות": "sensitivity", "גישור": "bridging", "שבת": "Shabbat", "לד": "LED", "מסוכך": "shielded", "מגע": "contact", "עשן": "smoke", "סוללה": "battery", "סוללת": "battery", "תנועה": "motion", "שקעי": "sockets", "כיסוי": "cover", "ניפוץ": "break-glass", "פטריה": "mushroom", "ננעל": "lockable", "נייד": "portable", "מיכל": "tank", "למים": "for water", "עוור": "blind", "אוקסיאלי": "coaxial", "מלאה": "full", "כסוף": "silver", "מתכתי": "metallic", "קצר": "short", "נטען": "cordless", "ניטען": "cordless", "ניטענת": "cordless", "נטענת": "cordless", "בתיבה": "in box", "צר": "narrow", "מצב": "mode", "ידית": "handle", "ארוך": "long", "טיימר": "timer", "חכם": "smart", "זכוכית": "glass", "סיליקון": "silicone", "שקוף": "transparent", "לכלי": "for tool", "לעמוד": "for pole", "בית": "holder", "או": "or", "טלויזיה": "TV", "שקעים": "sockets", "שעות": "hours", "פטמות": "glands", "מיני": "mini", "למתח": "for voltage", "אומגה": "omega", "אומגות": "omegas", "רגיל": "regular", "אינפרו": "infrared", "לחשמלאי": "for electrician", "ג'מבו": "jumbo", "פליז": "brass", "קומתי": "floor-standing", "ברגים": "screws", "צידי": "side", "צדדי": "side", "מנוקב": "perforated", "אלקטרודה": "electrode", "אלקטרודות": "electrodes", "ארמאפלקס": "Armaflex", "בנד": "band", "תכליתי": "multipurpose", "גידי": "core", "דיגלון": "tag", "מוקצף": "foamed", "מקדחים": "drill bits", "רציפות": "continuity", "לסכין": "for knife", "מברגה": "screwdriver", "אימפקט": "impact", "מקדחה": "drill", "קונוס": "cone", "פטישון": "rotary hammer", "משחזת": "angle grinder", "משקפי": "glasses", "אצבע": "AA", "פטיש": "hammer", "אף": "nose", "פוליאסטר": "polyester", "ברקים": "lightning", "דופן": "wall", "סגירה": "closing", "למהדק": "for clamp", "שירות": "service", "מכני": "mechanical", "כתף": "shoulder", "מהדקים": "clamps", "בימטל": "bimetal", "ארמטורה": "fitting", "גוף": "fixture", "נורה": "bulb", "השכרת": "rental", "פיקדון": "deposit", "תשלום": "payment", "מקלף": "stripper", "מנחושת": "of copper", "להארקת": "for earthing", "יסוד": "foundation", "כבלים/חוטי": "cables/wires", "להשחלת": "for pulling", "צבעוני": "coloured", "לבניה": "for construction", "צינורית": "small tube", "מתיחה": "tension", "אוטומט": "automatic", "חצי": "semi", "חדר": "room", "עבור": "for", "עצמאי": "standalone", "ילדים": "children", "מוגני": "protected", "פוליפרופילן": "polypropylene", "חול": "sand", "טוש": "marker", "מחיק": "eraser", "כדור": "ball", "מאור": "light", "מעל": "above", "חיצים": "arrows", "מאזנת": "leveling", "לייזר": "laser", "לפילוס": "for leveling", "קווים": "lines", "מברשת": "brush", "פלדה": "steel", "מדבקה": "sticker", "לפרק": "for joint", "מזגן": "air conditioner", "ג'ריקן": "jerrycan", "ליטר": "litre", "ברז": "tap", "חלונית": "window", "מספרי": "scissors", "מספרים": "scissors", "לחיתוך": "for cutting", "קומבי": "combi", "מסתמים": "valves", "ללוחות": "for boards", "מערבל": "mixer", "כניסה": "shank", "מערכת": "system", "מקצרים": "short-circuits", "מפזר": "diffuser", "חשמלי": "electric", "נעילה": "locking", "קוטב": "pole", "חילוף": "spare", "חיצוני": "external", "משתחרר": "releasable", "בסיבוב": "by turning", "מסוד": "Mesud", "מרכזת": "control panel", "אינטרקום": "intercom", "משור": "saw", "ידני": "manual", "לאביזרי": "for accessories", "לביטים": "for bits", "תעשייתי": "industrial", "לתקע": "for plug", "מתג": "switch", "נתיך": "fuse", "קרמי": "ceramic", "וולט": "volt", "עבודת": "work", "שעה": "hour", "עגלה": "trolley", "מצבית": "mode", "עמדת": "station", "פאוץ'": "pouch", "צל": "shade", "פלס": "level", "גרומט": "grommet", "פתחים": "openings", "ופינות": "and corners", "שרטוט": "drawing", "ציוד": "equipment", "ואביזרים": "and accessories", "יתושים": "mosquito", "תוכי": "parrot", "לחתוך": "to cut", "קיט": "kit", "רתכת": "welding machine"};
for (const [k, v] of Object.entries(W2)) if (!WORDS[k]) WORDS[k] = [v, spell(k)];
const PH2 = [['כבל חשמל', 'Electrical cable', 'KEVEL CHASHMEL'], ['חוט חשמל', 'Electrical wire', 'CHUT CHASHMEL'], ['צינור חשמל', 'Electrical conduit', 'TZINOR CHASHMEL'], ['חסין אש', 'Fire-resistant', 'CHASIN ESH'], ['תעלת כבלים', 'Cable tray', 'TAALAT KVALIM'], ['סולם כבלים', 'Cable ladder', 'SULAM KVALIM'], ['גילוון חם', 'Hot-dip galvanized', 'GILVUN CHAM'], ['כבלים חסין אש', 'Fire-resistant cables', 'KVALIM CHASIN ESH'], ['נעל כבל', 'Cable lug', 'NAAL KEVEL'], ['על הטיח', 'Surface-mounted', 'AL HATIACH'], ['מקדחה פטישון', 'Rotary hammer drill', 'MAKDECHA PATISHON'], ['משחזת זוית', 'Angle grinder', 'MASHCHETET ZAVIT'], ['פטיש חציבה', 'Demolition hammer', 'PATISH CHATZIVA']];
PH2.forEach(p => PHRASES.push(p));
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
    if (w === 'מטר' && /^\d/.test(parts[i - 1] || '')) { out.push(idx === 1 ? 'm' : 'METER'); continue; }   // "100 מטר" = 100 metres, not a tape measure
    const g = w.match(/^§G(\d+)§$/);
    if (g) { out.push(idx === 1 ? `${g[1]}-gang` : `${g[1]} MAKOM`); continue; }
    if (WORDS[w]) out.push(WORDS[w][idx - 1]);
    else if (idx === 1 && w.length > 3 && 'לבוה'.includes(w[0]) && WORDS[w.slice(1)]) out.push((w[0] === 'ל' ? 'for ' : w[0] === 'ב' ? 'in ' : '') + WORDS[w.slice(1)][0]);
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
