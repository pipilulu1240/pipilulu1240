const CACHE_NAME = "v15";
const APP_SHELL = [
  "./",
  "./index.html",
  "./admin.html",
  "./manifest.json",
  "./manifest-admin.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
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

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  const isSupabaseApi =
    url.hostname.includes("supabase.co") &&
    (
      url.pathname.startsWith("/rest/v1/") ||
      url.pathname.startsWith("/auth/v1/") ||
      url.pathname.startsWith("/storage/v1/") ||
      url.pathname.startsWith("/realtime/v1/") ||
      url.pathname.startsWith("/functions/v1/")
    );

  const isDocument = req.mode === "navigate" || req.destination === "document";

  // 1) API：永遠走網路，禁止回舊快取資料
  if (isSupabaseApi) {
    event.respondWith(
      fetch(req, { cache: "no-store" }).catch(() =>
        new Response(JSON.stringify({ error: "offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" }
        })
      )
    );
    return;
  }

  // 2) HTML 頁面：Network First（拿最新）
  if (isDocument) {
    event.respondWith(
      fetch(req, { cache: "no-store" })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  // 3) 其他靜態資源：Stale-While-Revalidate
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