// Melody Lust's service worker: lets the app open from the home screen without a connection.
// Pages are always fetched fresh when there is a connection, so a new deploy is never hidden
// behind an old copy; the saved copy is only used when the network fails. Search, shopping,
// AI and sign-in go straight to the network and are never stored.
const VERSION = "ml-v1";
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;
const MAX_ASSETS = 400;
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

/** How a request is handled: "page" (network, then saved copy), "asset" (saved copy, refreshed behind), or "network". */
function strategyFor(request, origin) {
  if (request.method !== "GET") return "network";
  const url = new URL(request.url);
  if (FONT_HOSTS.includes(url.hostname)) return "asset";
  if (url.origin !== origin) return "network";
  if (url.pathname.startsWith("/_serverFn") || url.pathname.startsWith("/api/")) return "network";
  if (request.mode === "navigate") return "page";
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/fonts/") || url.pathname.startsWith("/icons/")) return "asset";
  return ["script", "style", "font", "image"].includes(request.destination) ? "asset" : "network";
}

const OFFLINE_PAGE = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Offline — Melody Lust</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0B040B;color:#FAF9F6;font-family:system-ui,sans-serif;text-align:center;padding:24px">
<main><h1 style="font-size:28px;margin:0 0 12px">You're offline</h1><p style="margin:0 0 20px;color:#8E788C">Melody Lust needs a connection the first time it opens a page.</p>
<a href="" style="color:#D4FF32">Try again</a></main></body></html>`;

async function trim(cache) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ASSETS)).map((key) => cache.delete(key)));
}

async function page(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match("/")) || new Response(OFFLINE_PAGE, { status: 503, headers: { "content-type": "text/html; charset=utf-8" } });
  }
}

async function asset(request) {
  const cache = await caches.open(ASSETS);
  const saved = await cache.match(request);
  const fresh = fetch(request).then((response) => {
    if (response.ok || response.type === "opaque") cache.put(request, response.clone()).then(() => trim(cache));
    return response;
  });
  if (!saved) return fresh;
  fresh.catch(() => {});
  return saved;
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => !name.startsWith(VERSION)).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const strategy = strategyFor(event.request, self.location.origin);
  if (strategy === "page") event.respondWith(page(event.request));
  else if (strategy === "asset") event.respondWith(asset(event.request));
});

// The first visit loads its files before this worker is in control; the page sends their
// addresses (and its own) afterwards so that visit is saved too.
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "save" || !Array.isArray(data.urls)) return;
  event.waitUntil((async () => {
    for (const url of data.urls.slice(0, 150)) {
      const request = new Request(url, data.page === url ? { mode: "same-origin" } : undefined);
      try {
        if (data.page === url) {
          const response = await fetch(request);
          if (response.ok) await (await caches.open(PAGES)).put(url, response);
        } else if (strategyFor(request, self.location.origin) === "asset") {
          const cache = await caches.open(ASSETS);
          if (!(await cache.match(request))) await asset(request);
        }
      } catch { /* offline or blocked: skip */ }
    }
  })());
});
