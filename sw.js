// sw.js
const VERSION = new URL(self.location).searchParams.get("v") || "v1";
const CACHE_NAME = `pwa-${VERSION}`;

const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    'https://vmjczgepqlefbsfarogk.supabase.co/storage/v1/object/public/logo/logo__2_-removebg-preview.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            caches.keys().then((keys) => {
                return Promise.all(
                    keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
                );
            }),
            self.clients.claim()
        ])
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    // ✅ HTML 用「網路優先」，避免舊版卡住
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((res) => {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
                    return res;
                })
                .catch(() => caches.match('/index.html'))
        );
        return;
    }

    // 其他資源用「快取優先」
    event.respondWith(
        caches.match(event.request).then((response) => {
            return (
                response ||
                fetch(event.request).then((res) => {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                    return res;
                })
            );
        })
    );
});

// 監聽來自頁面的更新指令
self.addEventListener('message', (event) => {
    if (
        event.data === 'SKIP_WAITING' ||
        (event.data && event.data.type === 'SKIP_WAITING')
    ) {
        self.skipWaiting();
    }
});