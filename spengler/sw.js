/* Service Worker: alles offline (statische Dateien, keine externen Abhaengigkeiten). */
const V = 'spengler-web-23';
const DATEIEN = ['./', 'index.html', 'app.css', 'texte.js', 'texte_weitere.js', 'neueteile_daten.js', 'normteile_daten.js', 'kern.js', 'zeichnung.js', 'weitereblaetter.js', 'neuezeichnung.js', 'normteile.js', 'neueblatt.js', 'fallrohr.js', 'neueteile.js', 'szene3d.js', 'basis.js', 'blatt.js', 'dialoge.js', 'skizze.js', 'weitereseite.js', 'home.js', 'weitere.js', 'alt.js', 'rohr.js', 'kaminaltblatt.js', 'kaminalt.js', 'verteiler.js', 'bestaetigen_daten.js', 'bestaetigen.js', 'kommentar.js', 'app.js',
  'fonts/Roboto-Regular.woff', 'fonts/Roboto-Bold.woff', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(DATEIEN)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => { const k = res.clone(); caches.open(V).then(c => c.put(e.request, k)); return res; }).catch(() => caches.match('index.html'))));
});
