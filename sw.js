// CivicLink PRO Service Worker for App Store & Play Store Compliance
const CACHE_NAME = 'civiclink-v1.4.0';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/index.css',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // Fallback for offline mode
        return caches.match('/index.html');
      });
    })
  );
});

// Push notification event handler for Play Store / App Store Push integration
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'CivicLink Emergency Alert', body: 'New dispatch or SOS alert received.' };
  const options = {
    body: data.body,
    icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiB2aWV3Qm94PSIwIDAgNTEyIDUxMiI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJsaW5rR3JhZCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzNCODJGNiIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzFENEVEOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiByeD0iMTIwIiBmaWxsPSJ1cmwoI2xpbmtHcmFkKSIvPjxwYXRoIGQ9Ik0xNjAgMjU2IEwyMjAgMjU2IE0yOTIgMjU2IEwzNTIgMjU2IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjQwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuNSIvPjxjaXJjbGUgY3g9IjI1NiIgY3k9IjI1NiIgcj0iMTgwIiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMwIi8+PHBhdGggZD0iTTI1NiAxMjAgVjM5MiBNMTIwIDI1NiBIMzkyIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuMyIvPjxjaXJjbGUgY3g9IjI1NiIgY3k9IjI1NiIgcj0iNjAiIGZpbGw9IndoaXRlIi8+PHBhdGggZD0iTTIzNiAyNTYgTDI3NiAyNTYgTTI1NiAyMzYgTDI1NiAyNzYiIHN0cm9rZT0iIzFENEVEOCIgc3Ryb2tlLXdpZHRoPSIxMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9zdmc+',
    badge: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiI+PGNpcmNsZSBjeD0iNDgiIGN5PSI0OCIgcj0iNDAiIGZpbGw9IiMzQjgyRjYiLz48L3N2Zz4=',
    vibrate: [200, 100, 200],
    data: { url: '/' }
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
