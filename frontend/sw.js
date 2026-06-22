/**
 * Pro Market Algérie — Service Worker
 *
 * Rôle : rendre le site installable (PWA) et résilient hors-ligne.
 * Stratégies :
 *   • Navigations (pages HTML)  → réseau d'abord, repli sur le cache puis sur
 *     une page hors-ligne. Évite d'afficher une vieille page périmée.
 *   • Assets statiques même-origine (CSS/JS/images/icônes/polices) →
 *     stale-while-revalidate (réponse instantanée + mise à jour en arrière-plan).
 *   • API (/api) et fichiers utilisateurs (/uploads) → JAMAIS mis en cache :
 *     toujours réseau, pour ne pas servir de données obsolètes ou privées.
 *
 * Pense à incrémenter CACHE_VERSION à chaque déploiement modifiant ces fichiers.
 */
const CACHE_VERSION = 'pm-v1';
const CACHE_NAME = `${CACHE_VERSION}-static`;

// Coquille applicative pré-mise en cache à l'installation.
const PRECACHE_URLS = [
  '/index.html',
  '/css/main.css',
  '/css/animations.css',
  '/css/rtl.css',
  '/js/main.js',
  '/js/api.js',
  '/manifest.webmanifest',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // addAll échoue si UNE seule ressource manque : on tolère les absences.
      .then((cache) => Promise.allSettled(PRECACHE_URLS.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Hors-périmètre : autre origine, API ou fichiers utilisateurs → on laisse passer.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/uploads')) return;

  // Navigations (pages HTML) : réseau d'abord, repli cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          return resp;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // Assets statiques : stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((resp) => {
          if (resp && resp.status === 200 && resp.type === 'basic') {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          }
          return resp;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
