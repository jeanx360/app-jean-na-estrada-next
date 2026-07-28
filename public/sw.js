const CACHE_VERSION = "jne-app-v0.6.0";
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const APP_ROUTES = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/data/content-feed.json",
  "/videos",
  "/noticias",
  "/tutoriais",
  "/aplicativos",
  "/produtos",
  "/guia",
  "/calculadora",
  "/parceiros",
  "/contato",
  "/configuracoes",
  "/icons/app-icon-192.png",
  "/icons/app-icon-512.png",
];

const PRIVATE_PREFIXES = [
  "/membros",
  "/vip",
  "/entrar",
  "/cadastro",
  "/recuperar-senha",
  "/atualizar-senha",
  "/auth/",
  "/api/",
  "/diagnostico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_ROUTES)));
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
              .map((key) => caches.delete(key)),
          ),
        ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);
    const canCache = response.ok && !response.headers.has("set-cookie") && response.type === "basic";
    if (canCache) await cache.put(request, response.clone());
    return response;
  } catch {
    return (
      (await cache.match(request)) ||
      (await caches.match(request)) ||
      (await caches.match("/")) ||
      (await caches.match("/offline.html"))
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (PRIVATE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate" || url.pathname.endsWith("/data/content-feed.json")) {
    event.respondWith(networkFirst(request));
    return;
  }

  const isStaticAsset =
    url.pathname.includes("/_next/static/") ||
    /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname);

  if (isStaticAsset) event.respondWith(cacheFirst(request));
});
