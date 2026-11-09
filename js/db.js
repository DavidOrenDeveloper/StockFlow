// IndexedDB wrapper. DB name is unique to this app (see config.js) so nothing collides with other apps on the same domain.
import { DB_NAME } from './config.js';
const STORES = { kv: 'k', items: 'id', images: 'id', docs: 'id', log: 'id' };
let dbp;
export function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => { const db = r.result; for (const [n, k] of Object.entries(STORES)) if (!db.objectStoreNames.contains(n)) db.createObjectStore(n, { keyPath: k }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return dbp;
}
const run = async (store, mode, fn) => { const db = await open(); return new Promise((res, rej) => { const tx = db.transaction(store, mode); const out = fn(tx.objectStore(store)); tx.oncomplete = () => res(out && out.result !== undefined ? out.result : undefined); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); }); };
export const getAll = s => run(s, 'readonly', st => st.getAll());
export const get = (s, k) => run(s, 'readonly', st => st.get(k));
export const put = (s, v) => run(s, 'readwrite', st => st.put(v));
export const putMany = (s, arr) => run(s, 'readwrite', st => { arr.forEach(v => st.put(v)); });
export const del = (s, k) => run(s, 'readwrite', st => st.delete(k));
export const clear = s => run(s, 'readwrite', st => st.clear());
export const kvGet = async (k, d) => { const r = await get('kv', k); return r ? r.v : d; };
export const kvSet = (k, v) => put('kv', { k, v });
export const stores = Object.keys(STORES);
