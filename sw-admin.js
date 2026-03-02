const CACHE_NAME = 'hugbear-admin-v20260303';
const APP_SHELL = [
  './',
  './admin.html',
  './manifest-admin.json',
  './logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 只攔 GET
  if (req.method !== 'GET') return;

  // Supabase 相關 API 一律走網路，不快取
  const isSupabaseApi =
    url.hostname.includes('supabase.co') &&
    (
      url.pathname.startsWith('/rest/v1/') ||
      url.pathname.startsWith('/auth/v1/') ||
      url.pathname.startsWith('/storage/v1/') ||
      url.pathname.startsWith('/realtime/v1/')
    );

  if (isSupabaseApi) {
    event.respondWith(fetch(req, { cache: 'no-store' }).catch(() => caches.match(req)));
    return;
  }

  // 導航頁面：Network First
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./admin.html')))
    );
    return;
  }

  // 其他靜態資源：Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((networkRes) => {
          const copy = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return networkRes;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});