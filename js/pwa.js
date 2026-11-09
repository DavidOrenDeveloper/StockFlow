// Service-worker lifecycle: register, detect updates, apply them on demand. Never touches IndexedDB / localStorage.
import { APP_VERSION, CACHE_PREFIX } from './config.js';
const st = { reg: null, onUpdate: () => {} };
export function initPWA(onUpdate) {
  st.onUpdate = onUpdate;
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' }).then(reg => {
    st.reg = reg;
    if (reg.waiting && navigator.serviceWorker.controller) onUpdate(reg);
    reg.addEventListener('updatefound', () => { const nw = reg.installing; nw && nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) onUpdate(reg); }); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
    setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
  }).catch(() => {});
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading) return; reloading = true; location.reload(); });
}
export const applyUpdate = () => { const w = st.reg && st.reg.waiting; if (w) w.postMessage({ type: 'SKIP_WAITING' }); else location.reload(); };
/** -> {status:'latest'|'ready'|'offline'|'error', remote} */
export async function checkForUpdate() {
  if (!navigator.onLine) return { status: 'offline' };
  try {
    const remote = (await (await fetch('version.json?_=' + Date.now(), { cache: 'no-store' })).json()).version;
    if (!st.reg) return { status: remote === APP_VERSION ? 'latest' : 'error', remote };
    await st.reg.update();
    for (let i = 0; i < 30 && !st.reg.waiting; i++) { if (!st.reg.installing && remote === APP_VERSION) break; await new Promise(r => setTimeout(r, 500)); }
    if (st.reg.waiting) { st.onUpdate(st.reg); return { status: 'ready', remote }; }
    return { status: 'latest', remote };
  } catch (e) { return { status: 'error' }; }
}
// Removes ONLY this app's own caches (by prefix) + its service worker. Data (IndexedDB) is left untouched.
export async function resetAppCache() {
  const keys = await caches.keys(); await Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX)).map(k => caches.delete(k)));
  const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.filter(r => r.scope === new URL('./', location.href).href).map(r => r.unregister()));
}
