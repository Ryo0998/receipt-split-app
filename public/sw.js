const CACHE = "receipt-app-v3";

// キャッシュするURLのパターン
const CACHE_PATTERNS = [
  /^\/$/, // トップページ
  /^\/_next\/static\//, // JS/CSS バンドル
  /^\/icon-/, // アイコン
  /^\/manifest/, // マニフェスト
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(["/", "/manifest.webmanifest", "/icon-192x192.png"])
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API呼び出しはキャッシュしない（ネットワーク優先）
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // _next/static/ は永続キャッシュ（ハッシュ付きなので安全）
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ??
          fetch(event.request).then((res) => {
            caches.open(CACHE).then((c) => c.put(event.request, res.clone()));
            return res;
          })
      )
    );
    return;
  }

  // その他: ネットワーク優先→失敗時キャッシュから返す
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // キャッシュ対象なら保存
        if (
          res.ok &&
          CACHE_PATTERNS.some((p) => p.test(url.pathname))
        ) {
          caches.open(CACHE).then((c) => c.put(event.request, res.clone()));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
