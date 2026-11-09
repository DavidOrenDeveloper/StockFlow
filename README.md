# ספירת מלאי והזמנות · Stock Count & Orders (PWA)

Static app – no build step, no server. Upload this folder to GitHub and serve it with Pages.

- `index.html`, `manifest.webmanifest`, `sw.js`, `version.json` – app shell / PWA
- `js/` – modules (`store.js` data, `search.js` smart search, `lexicon.js` Hebrew→English/Latin, `exporter.js`, `xlsx.js`, `waShare.js`, `views/`)
- `css/app.css`, `icons/`, `data/seed.json` + `data/img/` – first-run catalog (imported once, then lives in the device)
- `tools/build-seed.mjs` – how seed.json was produced from the spreadsheet

**Release a new version:** change the version in 3 places (`js/config.js`, `sw.js`, `version.json`) and push.
Users see an "Update now" button; their data is never touched.

**Unique identity:** everything derives from `stockcount-7f3a9c` (manifest `id`, cache names, IndexedDB name, localStorage prefix).
Other apps on the same github.io domain must keep their own scope (their folder) and ideally their own manifest `id`.
