// sw.js
const CACHE_NAME = "v10"; 
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    'https://vmjczgepqlefbsfarogk.supabase.co/storage/v1/object/public/logo/logo__2_-removebg-preview.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting(); // 強制跳過等待，準備更新
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
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
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