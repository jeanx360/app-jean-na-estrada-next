const CACHE_VERSION = "jne-app-v0.5.0";
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const APP_ROUTES = [
  "./",
  "./offline.html",
  "./manifest.webmanifest",
  "./data/content-feed.json",
  "./videos/",
  "./noticias/",
  "./tutoriais/",
  "./aplicativos/",
  "./produtos/",
  "./guia/",
  "./calculadora/",
  "./parceiros/",
  "./contato/",
  "./membros/",
  "./configuracoes/",
  "./icons/app-icon-192.png",
  "./icons/app-icon-512.png",
];

function scopedUrl(relativePath) {
  return new URL(relativePath, self.registration.scope).toString();
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_ROUTES.map(scopedUrl)))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith("jne-app-") && key !== CACHE_VERSION && key !== RUNTIME_CACHE)
              .map((key) => caches.delete(key))
          )
        ),
      self.clients.claim(),
    ])
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    return (
      (await cache.match(request)) ||
      (await caches.match(request)) ||
      (await caches.match(scopedUrl("./"))) ||
      (await caches.match(scopedUrl("./offline.html")))
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);

  if (response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(request, response.clone());
  }

  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate" || url.pathname.endsWith("/data/content-feed.json")) {
    event.respondWith(networkFirst(request));
    return;
  }

  const isStaticAsset =
    url.pathname.includes("/_next/static/") ||
    /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(cacheFirst(request));
  }
});
