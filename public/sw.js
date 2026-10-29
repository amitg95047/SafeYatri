/* Same-origin static shell only; no route, tile, authentication or API caching. */
const CACHE_NAME = "safeyatri-shell-v1";
const SHELL = ["/", "/index.html"];
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(SHELL);
    // The worker may install after the first asset requests. Seed the scripts,
    // styles and local images referenced by the built shell for first offline use.
    const response = await cache.match("/index.html");
    if (response) {
      const html = await response.text();
      const assets = [...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)].map((match) => match[1]);
      await Promise.allSettled(assets.map((asset) => cache.add(asset)));
      // CSS background images are also part of the shell. This only follows
      // same-origin image/font URLs, never Google Fonts or map tile servers.
      const styleImages = [];
      for (const asset of assets.filter((path) => path.endsWith(".css"))) {
        const stylesheet = await cache.match(asset);
        if (!stylesheet) continue;
        const css = await stylesheet.text();
        for (const match of css.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) {
          const image = new URL(match[1], new URL(asset, self.location.origin));
          if (image.origin === self.location.origin && /\.(?:png|jpe?g|webp|svg|woff2?)$/i.test(image.pathname) && !image.search) styleImages.push(image.href);
        }
      }
      await Promise.allSettled([...new Set(styleImages)].map((asset) => cache.add(asset)));
    }
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("safeyatri-shell-") && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.search || url.pathname.startsWith("/__")) return;
  const navigation = request.mode === "navigate";
  const staticAsset = url.pathname.startsWith("/assets/") || /\.(?:png|jpe?g|webp|svg|ico|woff2?)$/i.test(url.pathname);
  if (!navigation && !staticAsset) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (!navigation) {
      const hit = await cache.match(request);
      if (hit) return hit;
    }
    try {
      const response = await fetch(request);
      if (response.ok && response.type === "basic") {
        try { await cache.put(navigation ? "/index.html" : request, response.clone()); } catch { /* A full device cache must not discard a successful response. */ }
      }
      return response;
    } catch {
      const hit = await cache.match(navigation ? "/index.html" : request);
      return hit || Response.error();
    }
  })());
});
