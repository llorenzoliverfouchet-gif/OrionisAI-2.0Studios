const CACHE = 'orionis-ai-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Le shell (HTML/manifest) part sur le réseau en priorité pour ne jamais rester
// bloqué sur une version en cache après un déploiement ; le cache ne sert que de
// secours hors-ligne. Les autres assets restent cache-first pour la vitesse.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Les appels vers Pollinations (chat/image) et Google Fonts sont laissés au
  // réseau natif : les mettre en cache n'apporterait rien (seed aléatoire à
  // chaque requête) et ça évite tout risque d'interférence avec le CORS.
  if (new URL(e.request.url).origin !== self.location.origin) return;

  const isShell = e.request.mode === 'navigate' || e.request.url.endsWith('manifest.json');

  if (isShell) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
