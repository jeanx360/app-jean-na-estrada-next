const CACHE_VERSION = "jne-app-v1.16.0";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

const PRECACHE = [
  "/offline.html",
  "/manifest.webmanifest",
  "/data/content-feed.json",
  "/icons/app-icon-192.png",
  "/icons/app-icon-512.png",
  "/icons/app-icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon-16x16.png",
  "/icons/favicon-32x32.png",
  "/favicon.ico",
];

const PRIVATE_PREFIXES = [
  "/membros",
  "/motorista",
  "/perfil",
  "/aceite",
  "/vip",
  "/assinar",
  "/comunidade",
  "/admin",
  "/entrar",
  "/cadastro",
  "/recuperar-senha",
  "/atualizar-senha",
  "/auth/",
  "/api/",
  "/diagnostico",
  "/notificacoes",
  "/configuracoes",
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

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "JNE App", body: event.data ? event.data.text() : "Nova notificação disponível." };
  }

  const title = payload.title || "JNE App";
  const options = {
    body: payload.body || "Nova notificação disponível.",
    icon: payload.icon || "/icons/app-icon-192.png",
    badge: payload.badge || "/icons/favicon-32x32.png",
    image: payload.image || undefined,
    tag: payload.notificationId ? `jne-${payload.notificationId}` : `jne-${Date.now()}`,
    renotify: Boolean(payload.notificationId),
    requireInteraction: payload.category === "reservations",
    vibrate: payload.category === "reservations" ? [250, 100, 250, 100, 450] : [120],
    data: {
      url: payload.url || "/notificacoes",
      notificationId: payload.notificationId || null,
      category: payload.category || "general",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/notificacoes", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      for (const client of clients) {
        if ("focus" in client && new URL(client.url).origin === self.location.origin) {
          if ("navigate" in client) await client.navigate(target);
          return client.focus();
        }
      }

      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    }),
  );
});
