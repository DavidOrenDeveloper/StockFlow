// Smart multilingual search: Hebrew / English / transliteration / SKU / synonyms.
// Tier 0 = exact-ish matches, tier 1 = approximate (typos, loose spelling). Numbers & sizes are never blurred.
const NIQQUD = /[\u0591-\u05C7]/g;
const FINAL = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };

export function norm(s) {
  s = String(s ?? '').toLowerCase().replace(NIQQUD, '');
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/[׳'’‘`´"״“”]/g, '');                       // quotes / geresh
  s = s.replace(/[ךםןףץ]/g, c => FINAL[c]);
  s = s.replace(/(\d)\s*[x×*]\s*(\d)/g, '$1x$2').replace(/(\d),(\d)/g, '$1.$2');  // 3 × 1.5 -> 3x1.5
  s = s.replace(/([a-z\u05D0-\u05EA])[-_](\d)/g, '$1$2');                      // m-18 -> m18
  s = s.replace(/[^\p{L}\p{N}./x\s-]/gu, ' ').replace(/[-_]/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}
// Hebrew spelling-insensitive key: drop vav / yod (תוכנית = תכנית, ביצים = בייצים), collapse doubles
export function loose(s) {
  return norm(s).split(' ').map(t => {
    if (/[\u05D0-\u05EA]/.test(t)) { const r = t.replace(/[וי]/g, ''); t = (r || t).replace(/(.)\1+/g, '$1'); }
    else if (!/\d/.test(t)) {
      t = t.replace(/kh|ch|x(?!\d)/g, 'h').replace(/ck|q/g, 'k').replace(/ph/g, 'f').replace(/w/g, 'v').replace(/tz|ts|z/g, 'z').replace(/sh/g, 's')
           .replace(/[yj]/g, 'i').replace(/c(?=[eiy])/g, 's').replace(/c/g, 'k').replace(/(.)\1+/g, '$1');
    }
    return t;
  }).join(' ');
}
// vav/yod-insensitive Hebrew only (kept in the exact tier)
export const heLoose = s => norm(s).split(' ').map(t => /[\u05D0-\u05EA]/.test(t) ? ((t.replace(/[וי]/g, '') || t).replace(/(.)\1+/g, '$1')) : t).join(' ');
const isNum = t => /\d/.test(t);

// numeric-safe substring: "1.5" must not hit "11.5" / "1.55"; "3x1.5" must not hit "3x1.55" or "3x2.5"
function numHit(tok, text) {
  let i = text.indexOf(tok);
  while (i !== -1) {
    const b = text[i - 1], a = text[i + tok.length], a2 = text[i + tok.length + 1];
    const okB = !b || !/[\d.]/.test(b);
    const okA = !a || !(/\d/.test(a) || (a === '.' && /\d/.test(a2 || '')));
    if (okB && okA) return true;
    i = text.indexOf(tok, i + 1);
  }
  return false;
}
function lev(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let min = i;
    for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); min = Math.min(min, cur[j]); }
    if (min > max) return max + 1; prev = cur;
  }
  return prev[b.length];
}
// score one query token against one field text (already normalised); 0 = no match
function tokScore(q, text, toks) {
  if (isNum(q)) return numHit(q, text) ? (toks.includes(q) ? 3 : 2) : 0;
  if (toks.includes(q)) return 3;                       // whole word
  if (toks.some(t => t.startsWith(q))) return 2.5;      // word start
  return text.includes(q) ? 1.5 : 0;                    // inside a word
}
function fieldScore(qt, qFull, text) {
  if (!text) return 0;
  if (text === qFull) return 100;
  const toks = text.split(' ');
  let sum = 0;
  for (const q of qt) { const s = tokScore(q, text, toks); if (!s) return 0; sum += s; }
  let sc = 40 + (sum / qt.length) * 12;                                   // 58..76
  if (text.startsWith(qFull)) sc += 14;
  else if (text.includes(qFull)) sc += 8;
  if (qt.length > 1) { let p = -1, ord = true; for (const q of qt) { const k = text.indexOf(q, p + 1); if (k < 0) { ord = false; break; } p = k; } if (ord) sc += 4; }
  return Math.min(sc, 99);
}
function looseScore(qt, text) {
  if (!text) return 0;
  const toks = text.split(' ');
  let total = 0;
  for (const q of qt) {
    if (isNum(q)) { if (!numHit(q, text)) return 0; total += 2; continue; }
    if (toks.some(t => t.includes(q))) { total += 2; continue; }
    const heb = /[\u05D0-\u05EA]/.test(q);
    const max = q.length >= 7 ? 2 : q.length >= (heb ? 4 : 3) ? 1 : 0;
    if (!max) return 0;
    let ok = false;
    for (const t of toks) { if (!isNum(t) && lev(q, t.slice(0, Math.max(q.length, 1) + max), max) <= max) { ok = true; break; } if (!isNum(t) && lev(q, t, max) <= max) { ok = true; break; } }
    if (!ok) return 0; total += 1;
  }
  return 20 + (total / qt.length) * 8;
}

// ---- index ----
export function buildIndex(items, names) {
  // names: (item) => {he,en,tr}; items carry sku, syn[]
  return items.map(it => {
    const n = names(it);
    const f = { sku: norm(it.sku), he: norm(n.he), en: norm(n.en), tr: norm(n.tr) };
    const syn = (it.syn || []).map(norm).filter(Boolean);
    const all = [f.he, f.en, f.tr, ...syn].filter(Boolean).join(' ');
    const f2 = { he: heLoose(n.he), en: heLoose(n.en), tr: heLoose(n.tr), all: heLoose(all), syn: syn.map(heLoose) };
    return { it, f, f2, syn, all, l: { he: loose(n.he), en: loose(n.en), tr: loose(n.tr), all: loose([n.he, n.en, n.tr, ...(it.syn || [])].join(' ')) } };
  });
}
// Built-in abbreviations that always mean the same thing (searching either form finds both): על הטיח = עה"ט, תחת הטיח = תה"ט, חצי אוטומט = ח"א = מאמ"ת = מא"ז ...
const BUILTIN = [['עהט', 'על הטיח'], ['תהט', 'תחת הטיח'], ['חא', 'חצי אוטומט', 'חצי אוטומטי', 'מאמת', 'מאז', 'מפסק אוטומטי זעיר', 'מפסק זעיר'], ['מוגמ', 'מוגן מים'], ['גת', 'גות', 'גוף תאורה'], ['פהפ', 'פס השוואת פוטנציאלים', 'פס השוואה'], ['יקא', 'יקע', 'hdpe']].map(g => g.map(norm));
function phraseVariants(qn) {
  const out = [], pad = ` ${qn} `;
  for (const g of BUILTIN) for (const m of g) if (pad.includes(` ${m} `)) for (const o of g) if (o !== m) out.push(pad.replace(` ${m} `, ` ${o} `).trim());
  return out;
}
function expandQueries(qn, groups) {
  const variants = [{ q: qn, syn: false }];
  const seen = new Set([qn]);
  const add = q => { if (!seen.has(q) && variants.length < 40) { seen.add(q); variants.push({ q, syn: true }); } };
  phraseVariants(qn).forEach(q => { if (!seen.has(q)) { seen.add(q); variants.push({ q, syn: false }); } });
  if (!groups || !groups.length) return variants;
  const gk = groups.map(g => g.words.map(norm).filter(Boolean));
  gk.forEach(ws => { if (ws.includes(qn)) ws.forEach(w => add(w)); });
  const toks = qn.split(' ');
  if (toks.length > 1) toks.forEach((t, i) => gk.forEach(ws => { if (ws.includes(t) && !isNum(t)) ws.forEach(w => add([...toks.slice(0, i), w, ...toks.slice(i + 1)].join(' '))); }));
  return variants;
}
const W = { sku: 1.0, he: 1.0, en: 0.97, tr: 0.97, syn: 0.9, all: 0.78 };
export function search(index, query, opts = {}) {
  const qn = norm(query);
  if (!qn) return null;
  const variants = expandQueries(qn, opts.synOn ? opts.groups : null);
  const exact = [], approx = [];
  for (const row of index) {
    let best = 0, by = '', viaSyn = false;
    for (const v of variants) {
      const qt = v.q.split(' ');
      const pen = v.syn ? 0.85 : 1;
      const cands = [['sku', row.f.sku], ['he', row.f.he], ['en', row.f.en], ['tr', row.f.tr]];
      for (const [k, txt] of cands) {
        let s = fieldScore(qt, v.q, txt) * W[k] * pen;
        if (k === 'sku' && txt && (txt.startsWith(v.q) || txt === v.q)) s = Math.max(s, txt === v.q ? 100 : 88);
        if (s > best) { best = s; by = k; viaSyn = v.syn; }
      }
      if (opts.itemSyn !== false) for (const sy of row.syn) { const s = fieldScore(qt, v.q, sy) * W.syn * pen; if (s > best) { best = s; by = 'syn'; viaSyn = true; } }
      const sa = fieldScore(qt, v.q, row.all) * W.all * pen; if (sa > best) { best = sa; by = 'all'; viaSyn = v.syn; }
      // spelling-tolerant Hebrew (תוכנית / תכנית): still an exact-tier match, a hair lower
      const hq = heLoose(v.q), ht = hq.split(' ');
      for (const k of ['he', 'en', 'tr', 'all']) { const s = fieldScore(ht, hq, row.f2[k]) * (W[k] ?? 1) * pen * 0.95; if (s > best) { best = s; by = k; viaSyn = v.syn; } }
      if (opts.itemSyn !== false) for (const sy of row.f2.syn) { const s = fieldScore(ht, hq, sy) * W.syn * pen * 0.95; if (s > best) { best = s; by = 'syn'; viaSyn = true; } }
    }
    if (best >= 40) { exact.push({ it: row.it, score: best, by, viaSyn, tier: 0 }); continue; }
    if (opts.fuzzy !== false) {
      const lq = loose(qn).split(' ');
      let s = Math.max(looseScore(lq, row.l.he), looseScore(lq, row.l.en), looseScore(lq, row.l.tr), looseScore(lq, row.l.all));
      if (s) approx.push({ it: row.it, score: s, by: 'loose', viaSyn: false, tier: 1 });
    }
  }
  const cmp = (a, b) => b.score - a.score || (a.it.order ?? 0) - (b.it.order ?? 0);
  exact.sort(cmp); approx.sort(cmp);
  return { exact, approx };
}
