// Application state + all data operations. Views read S and call these functions; nothing here touches the DOM.
import * as db from './db.js';
import { uid, today, blobToDataURL, dataURLToBlob } from './util.js';
import { buildIndex, search } from './search.js';
import { suggestTr } from './lexicon.js';
import { APP_ID, APP_VERSION } from './config.js';

export const DOC_STATUS = { count: ['draft', 'completed'], order: ['draft', 'submitted', 'partial', 'completed', 'cancelled'] };
const DEFAULT_CFG = { lang: 'he', worker: '', workerMode: false, synOn: true, fuzzy: true, theme: 'auto', seeded: false, lastBackup: null, lastSite: '', view: 'cards' };
export const S = { items: [], byId: new Map(), cats: [], units: [], sites: [], folders: [], groups: [], docs: [], cfg: { ...DEFAULT_CFG }, img: new Map(), index: [], log: [] };
const subs = new Set();
export const onChange = fn => { subs.add(fn); return () => subs.delete(fn); };
const emit = () => subs.forEach(f => f());

export const uiLang = () => (S.cfg.lang === 'he' ? 'he' : 'en');
// display name of anything with {he,en,tr}; translit mode falls back to auto-transliteration
export function nm(e, lg = S.cfg.lang) {
  if (!e) return '';
  if (lg === 'en') return e.en || e.tr || e.he || '';
  if (lg === 'tr') return e.tr || (e.he ? suggestTr(e.he) : '') || e.en || '';
  return e.he || e.en || e.tr || '';
}
export const catOf = id => S.cats.find(c => c.id === id);
export const unitOf = id => S.units.find(u => u.id === id);
export const siteOf = id => S.sites.find(s => s.id === id);

function reindex() {
  S.items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  S.byId = new Map(S.items.map(i => [i.id, i]));
  S.index = buildIndex(S.items, it => ({ he: it.he, en: it.en, tr: it.tr || suggestTr(it.he) }));
}
export function runSearch(q) { return search(S.index, q, { groups: S.groups, synOn: S.cfg.synOn, fuzzy: S.cfg.fuzzy }); }

const LISTS = { cats: 'cats', units: 'units', sites: 'sites', folders: 'folders', groups: 'groups' };
export const saveList = async n => { await db.kvSet(n, S[n]); emit(); };
export async function setCfg(patch) { Object.assign(S.cfg, patch); await db.kvSet('cfg', S.cfg); emit(); }

export async function log(action, text, ref) {
  const e = { id: uid('l'), ts: new Date().toISOString(), action, text, ref: ref || null, by: S.cfg.worker || '' };
  S.log.unshift(e); if (S.log.length > 800) S.log.length = 800;
  await db.put('log', e);
}

// ---------- init / seed ----------
export async function init() {
  const [cfg, items, docs, logs] = await Promise.all([db.kvGet('cfg', null), db.getAll('items'), db.getAll('docs'), db.getAll('log')]);
  S.cfg = { ...DEFAULT_CFG, ...(cfg || {}) };
  for (const n of Object.keys(LISTS)) S[n] = await db.kvGet(n, []);
  S.items = items; S.docs = docs; S.log = logs.sort((a, b) => b.ts.localeCompare(a.ts));
  if (!S.cfg.seeded && !items.length) await seed();
  await loadImages(); reindex();
}
async function seed() {
  const seed = await (await fetch('data/seed.json', { cache: 'no-cache' })).json();
  S.cats = seed.categories; S.units = seed.units; S.sites = seed.sites; S.folders = seed.folders; S.groups = seed.synonyms;
  for (const n of Object.keys(LISTS)) await db.kvSet(n, S[n]);
  const now = new Date().toISOString(), imgs = [];
  S.items = seed.items.map(r => { if (r.img) imgs.push([r.id, r.img]); const { img, ...it } = r; return { ...it, imgId: r.img ? r.id : null, createdAt: now, updatedAt: now }; });
  await db.putMany('items', S.items);
  for (let i = 0; i < imgs.length; i += 24) await Promise.all(imgs.slice(i, i + 24).map(async ([id, url]) => { try { const b = await (await fetch(url)).blob(); await db.put('images', { id, blob: b }); } catch (e) { /* offline during first run: item simply has no image */ } }));
  S.cfg.seeded = true; await db.kvSet('cfg', S.cfg);
  await log('seed', `catalog imported (${S.items.length})`);
}
async function loadImages() {
  S.img.forEach(u => URL.revokeObjectURL(u)); S.img.clear();
  for (const r of await db.getAll('images')) S.img.set(r.id, URL.createObjectURL(r.blob));
}
export const imgOf = it => (it && it.imgId && S.img.get(it.imgId)) || '';
export async function setImage(item, blob) {
  const id = item.imgId || ('img_' + item.id);
  await db.put('images', { id, blob }); const old = S.img.get(id); if (old) URL.revokeObjectURL(old);
  S.img.set(id, URL.createObjectURL(blob)); item.imgId = id;
}
export async function removeImage(item) { if (item.imgId) { await db.del('images', item.imgId); S.img.delete(item.imgId); item.imgId = null; } }

// ---------- items ----------
export const newItem = () => ({ id: uid('i'), sku: '', he: '', en: '', tr: '', cat: S.cats[0]?.id || '', unit: S.units[0]?.id || '', emergency: null, syn: [], imgId: null, note: '', order: Math.max(0, ...S.items.map(i => i.order || 0)) + 1, createdAt: new Date().toISOString() });
export async function saveItem(it) {
  it.updatedAt = new Date().toISOString(); it.sku = String(it.sku ?? '').trim();
  const isNew = !S.byId.has(it.id);
  if (isNew) S.items.push(it); else S.items[S.items.findIndex(x => x.id === it.id)] = it;
  await db.put('items', it); reindex(); await log(isNew ? 'item+' : 'item~', it.he || it.en, it.id); emit();
}
export async function deleteItem(id) {
  const it = S.byId.get(id); if (!it) return;
  await removeImage(it); await db.del('items', id); S.items = S.items.filter(x => x.id !== id); reindex(); await log('item-', it.he, id); emit();
}
export async function bulkItems(ids, patch) {
  for (const id of ids) { const it = S.byId.get(id); if (it) { Object.assign(it, patch, { updatedAt: new Date().toISOString() }); await db.put('items', it); } }
  reindex(); await log('bulk', `${ids.length} items`); emit();
}

// ---------- documents (counts & orders) ----------
const defaultFolder = type => (S.folders.find(f => f.type === type) || {}).id || '';
export function newDoc(type) {
  const site = S.cfg.lastSite && siteOf(S.cfg.lastSite) ? S.cfg.lastSite : (S.sites[0]?.id || '');
  return { id: uid('d'), type, site, date: today(), worker: S.cfg.worker || '', status: 'draft', folder: defaultFolder(type), note: '', lines: {}, snap: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), exportedAt: null, imported: null };
}
const snapOf = id => { const it = S.byId.get(id); return it ? { sku: it.sku, he: it.he, en: it.en, tr: it.tr, unit: nm(unitOf(it.unit), 'he'), unitEn: nm(unitOf(it.unit), 'en'), unitTr: nm(unitOf(it.unit), 'tr'), cat: nm(catOf(it.cat), 'he'), catEn: nm(catOf(it.cat), 'en'), catTr: nm(catOf(it.cat), 'tr'), emergency: it.emergency } : null; };
export async function saveDoc(d, { quiet = false } = {}) {
  d.updatedAt = new Date().toISOString();
  for (const id of Object.keys(d.lines)) { if (d.lines[id] == null) delete d.lines[id]; else if (!d.snap[id]) { const s = snapOf(id); if (s) d.snap[id] = s; } }
  const i = S.docs.findIndex(x => x.id === d.id); if (i < 0) S.docs.push(d); else S.docs[i] = d;
  await db.put('docs', d); if (d.site) S.cfg.lastSite = d.site;
  if (!quiet) emit();
}
export async function deleteDoc(id) { S.docs = S.docs.filter(d => d.id !== id); await db.del('docs', id); await log('doc-', id); emit(); }
export async function setStatus(d, st) { d.status = st; await saveDoc(d); await log('status', `${d.type}:${st}`, d.id); }
export const docItems = d => { // rows for a doc: catalog items (ordered) + deleted items kept via snapshot
  const rows = S.items.map(it => ({ id: it.id, it, snap: null }));
  for (const id of Object.keys(d.lines)) if (!S.byId.has(id) && d.snap[id]) rows.push({ id, it: null, snap: d.snap[id] });
  return rows;
};
export function lastCount(siteId, excludeId) {
  return S.docs.filter(d => d.type === 'count' && d.site === siteId && d.id !== excludeId && Object.keys(d.lines).length).sort((a, b) => (b.date + b.updatedAt).localeCompare(a.date + a.updatedAt))[0] || null;
}
export function orderFromCount(count) {
  const o = newDoc('order'); o.site = count.site; o.note = `from count ${count.date}`;
  for (const it of S.items) { const q = count.lines[it.id]; if (it.emergency != null && q != null && q < it.emergency) o.lines[it.id] = it.emergency - q; }
  return o;
}
export async function importDocEnvelope(env, { onConflict } = {}) {
  if (!env || env.app !== APP_ID || env.kind !== 'doc' || !env.doc) throw new Error('not-doc');
  const d = env.doc; d.snap = { ...(d.snap || {}), ...(env.snap || {}) };
  const ex = S.docs.find(x => x.id === d.id);
  if (ex) { const act = onConflict ? await onConflict(ex, d) : 'replace'; if (act === 'skip') return null; if (act === 'copy') { d.id = uid('d'); } }
  d.imported = { by: env.exportedBy || d.worker || '', at: new Date().toISOString() };
  if (!d.folder || !S.folders.find(f => f.id === d.folder)) d.folder = defaultFolder(d.type);
  await saveDoc(d); await log('import', `${d.type} ${d.worker} ${d.date}`, d.id); return d;
}
export const docEnvelope = d => ({ app: APP_ID, kind: 'doc', schema: 1, appVersion: APP_VERSION, exportedAt: new Date().toISOString(), exportedBy: S.cfg.worker || d.worker || '', doc: d, snap: d.snap });

// ---------- full backup ----------
export async function backupAll() {
  const images = []; for (const r of await db.getAll('images')) images.push({ id: r.id, data: await blobToDataURL(r.blob) });
  const kv = {}; for (const r of await db.getAll('kv')) kv[r.k] = r.v;
  S.cfg.lastBackup = new Date().toISOString(); await db.kvSet('cfg', S.cfg); kv.cfg = S.cfg;
  return { app: APP_ID, kind: 'backup', schema: 1, appVersion: APP_VERSION, createdAt: new Date().toISOString(), kv, items: S.items, docs: S.docs, log: S.log, images };
}
export async function restoreAll(b, mode = 'replace') {
  if (!b || b.app !== APP_ID || b.kind !== 'backup') throw new Error('not-backup');
  if (mode === 'replace') for (const s of db.stores) await db.clear(s);
  const newer = (a, c) => !a || (c.updatedAt || '') >= (a.updatedAt || '');
  const keep = []; // merge: only take newer records
  for (const it of b.items) if (mode === 'replace' || newer(S.byId.get(it.id), it)) keep.push(it);
  await db.putMany('items', keep);
  const dk = b.docs.filter(d => mode === 'replace' || newer(S.docs.find(x => x.id === d.id), d)); await db.putMany('docs', dk);
  for (const im of b.images) if (mode === 'replace' || !S.img.has(im.id)) await db.put('images', { id: im.id, blob: await dataURLToBlob(im.data) });
  if (mode === 'replace') { await db.putMany('log', b.log || []); for (const [k, v] of Object.entries(b.kv)) await db.kvSet(k, v); }
  else { for (const n of ['cats', 'units', 'sites', 'folders', 'groups']) { const cur = S[n], add = (b.kv[n] || []).filter(x => !cur.find(c => c.id === x.id)); if (add.length) await db.kvSet(n, [...cur, ...add]); } }
  await log('restore', mode);
  await init(); emit();
}
