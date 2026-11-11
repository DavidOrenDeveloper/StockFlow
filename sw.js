/* Service worker – scoped to this folder only. Cache names are prefixed with the app id, so it never touches other apps on the same domain. */
const APP_ID = 'stockcount-7f3a9c';
const VERSION = '1.6.1';                       // keep equal to js/config.js APP_VERSION and version.json
const CACHE = `${APP_ID}-cache-${VERSION}`;
const IMG_CACHE = `${APP_ID}-img-v2`;           // product images: survives app updates; bump the suffix only when image files are replaced
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'version.json', 'css/app.css', 'data/seed.json', 'data/shapir.json', 'data/remove.json',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png',
  'js/app.js', 'js/config.js', 'js/db.js', 'js/exporter.js', 'js/i18n.js', 'js/icons.js', 'js/lexicon.js', 'js/modal.js', 'js/pwa.js', 'js/search.js', 'js/store.js', 'js/util.js', 'js/waShare.js', 'js/xlsx.js',
  'js/views/catalog.js', 'js/views/docs.js', 'js/views/editor.js', 'js/views/exportDialog.js', 'js/views/itemEditor.js', 'js/views/settings.js', 'js/views/skuTools.js'
];
self.addEventListener('install', e => {
  // No skipWaiting here: the new version waits until the user taps "Update now" (so nobody loses a half-finished count).
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' }))))));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if ((k.startsWith(`${APP_ID}-cache-`) && k !== CACHE) || (k.startsWith(`${APP_ID}-img-`) && k !== IMG_CACHE)) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(new URL('./', self.location).pathname)) return;
  if (url.pathname.endsWith('/version.json')) { e.respondWith(fetch(req, { cache: 'no-store' }).catch(() => caches.match(req))); return; }
  if (url.pathname.includes('/data/img/')) {
    e.respondWith((async () => {
      const c = await caches.open(IMG_CACHE), hit = await c.match(req); if (hit) return hit;
      try { const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res; } catch (err) { return new Response('', { status: 504 }); }
    })());
    return;
  }
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (hit) return hit;
    if (req.mode === 'navigate') return (await caches.match('index.html')) || fetch(req);
    try { const res = await fetch(req); if (res.ok) (await caches.open(CACHE)).put(req, res.clone()); return res; } catch (err) { return new Response('', { status: 504 }); }
  })());
});
