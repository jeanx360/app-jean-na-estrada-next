const CACHE_VERSION = "jne-app-v0.7.1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

const PRECACHE = [
  "/offline.html",
  "/manifest.webmanifest",
  "/data/content-feed.json",
  "/icons/app-icon-192.png",
  "/icons/app-icon-512.png",
];

const PRIVATE_PREFIXES = [
  "/membros",
  "/vip",
  "/admin",
  "/entrar",
  "/cadastro",
  "/recuperar-senha",
  "/atualizar-senha",
  "/auth/",
  "/api/",
  "/diagnostico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
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
              .filter((key) => key.startsWith("jne-app-") && key !== STATIC_CACHE && key !== DATA_CACHE)
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

async function networkOnly(request) {
  return fetch(request, { cache: "no-store" });
}

async function navigationNetworkOnly(request) {
  try {
    return await fetch(request, { cache: "no-store" });
  } catch {
    return (await caches.match("/offline.html")) || Response.error();
  }
}

async function dataNetworkFirst(request) {
  const cache = await caches.open(DATA_CACHE);
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response.ok && response.type === "basic") await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || Response.error();
  }
}

async function staticCacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    const cache = await caches.open(STATIC_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  const isPrivate = PRIVATE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
  const isReactServerRequest =
    request.headers.get("RSC") === "1" ||
    request.headers.has("Next-Router-State-Tree") ||
    url.searchParams.has("_rsc");

  if (isPrivate || isReactServerRequest) {
    event.respondWith(networkOnly(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(navigationNetworkOnly(request));
    return;
  }

  if (url.pathname.endsWith("/data/content-feed.json")) {
    event.respondWith(dataNetworkFirst(request));
    return;
  }

  const isVersionedStaticAsset =
    url.pathname.includes("/_next/static/") ||
    /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname);

  if (isVersionedStaticAsset) {
    event.respondWith(staticCacheFirst(request));
  }
});
