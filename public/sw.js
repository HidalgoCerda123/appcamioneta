// Service Worker ConstruservAPP — cachea el shell para abrir sin señal.
const CACHE = "construserv-v2";
const ASSETS = [
  "/dashboard",
  "/dashboard/registrar-km",
  "/dashboard/inspeccion",
  "/dashboard/fallas/nueva",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/Logo construserv.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // nunca interceptar POST/PUT (datos, auth)
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // no tocar Supabase ni terceros

  if (request.mode === "navigate") {
    // Navegación: red primero, con respaldo en caché si no hay señal
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/dashboard")))
    );
    return;
  }

  // Estáticos: caché primero
  event.respondWith(
    caches.match(request).then((cached) =>
      cached ||
      fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      }).catch(() => cached)
    )
  );
});
