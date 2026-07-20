const CACHE_NAME = "prova-piastra-cache-v2";
const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/logo-dismat.jpeg",
  "/logo-dismat.jpg",
];

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const homeResponse = await fetch("/", { cache: "reload" });

  if (!homeResponse.ok) {
    throw new Error(`Impossibile memorizzare l'app offline: ${homeResponse.status}`);
  }

  const html = await homeResponse.clone().text();
  await cache.put("/", homeResponse.clone());
  await cache.put("/index.html", homeResponse.clone());

  // Vite genera nomi con hash per JavaScript e CSS. Li ricaviamo dall'HTML
  // prodotto, cosi la PWA e completa gia al primo avvio offline.
  const builtAssets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => new URL(match[1], self.location.origin))
    .filter((url) => url.origin === self.location.origin)
    .map((url) => `${url.pathname}${url.search}`);

  try {
    const manifestResponse = await fetch("/asset-manifest.json", {
      cache: "reload",
    });

    if (manifestResponse.ok) {
      const buildManifest = await manifestResponse.clone().json();
      await cache.put("/asset-manifest.json", manifestResponse);

      Object.values(buildManifest).forEach((entry) => {
        if (entry.file) builtAssets.push(`/${entry.file}`);
        (entry.css || []).forEach((asset) => builtAssets.push(`/${asset}`));
        (entry.assets || []).forEach((asset) => builtAssets.push(`/${asset}`));
      });
    }
  } catch (error) {
    console.warn("Manifest di build non disponibile per la cache offline.", error);
  }

  const assets = [...new Set([...STATIC_ASSETS, ...builtAssets])];

  await Promise.all(
    assets.map(async (asset) => {
      try {
        const response = await fetch(asset, { cache: "reload" });
        if (response.ok) await cache.put(asset, response);
      } catch (error) {
        console.warn(`Risorsa offline non memorizzata: ${asset}`, error);
      }
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const requestCopy = response.clone();
            const homeCopy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, requestCopy);
              cache.put("/", homeCopy);
            });
          }
          return response;
        })
        .catch(async () => {
          return (
            (await caches.match(event.request)) ||
            (await caches.match("/")) ||
            (await caches.match("/index.html"))
          );
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (
          response.ok &&
          new URL(event.request.url).origin === self.location.origin
        ) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
