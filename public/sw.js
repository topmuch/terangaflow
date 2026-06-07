// ─── TerangaFlow Service Worker ─────────────────────────────────────────────
// Strategy: StaleWhileRevalidate for API + NetworkFirst for navigation

const CACHE_NAME = "terangaflow-v1";
const STATIC_ASSETS = ["/pwa", "/pwa/", "/pwa/alerts", "/pwa/services", "/pwa/profile", "/manifest.json"];

// ─── Install: Pre-cache critical pages ──────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignore failures for pages that aren't built yet
        console.log("[SW] Pre-cache skipped (pages not yet available)");
      });
    })
  );
  self.skipWaiting();
});

// ─── Activate: Clean old caches ────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch: Route-based caching strategy ─────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip Chrome extension requests
  if (url.protocol === "chrome-extension:") return;

  // ─── API calls: Stale-While-Revalidate ──────────────────────────────────
  // Serve from cache immediately, then update in background
  if (url.pathname.startsWith("/api/departures") || url.pathname.startsWith("/api/public")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // ─── Navigation / HTML pages: Network First with cache fallback ─────────
  if (
    request.mode === "navigate" ||
    url.pathname.startsWith("/pwa") ||
    url.pathname === "/"
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // ─── Static assets (JS, CSS, images): Cache First ──────────────────────
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg")
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ─── Everything else: Network with cache fallback ──────────────────────
  event.respondWith(networkFirst(request));
});

// ─── Stale-While-Revalidate ──────────────────────────────────────────────────

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

// ─── Network First ──────────────────────────────────────────────────────────

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;

    // Fallback to /pwa for navigation requests
    if (request.mode === "navigate") {
      const fallback = await cache.match("/pwa");
      if (fallback) return fallback;
    }

    return new Response("Hors ligne — TerangaFlow", {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

// ─── Cache First ─────────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) return cachedResponse;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response("Ressource non disponible", { status: 503 });
  }
}

// ─── Push Notification Handler ───────────────────────────────────────────────

self.addEventListener("push", (event) => {
  let data = { title: "TerangaFlow", body: "Nouvelle notification" };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || "terangaflow-notification",
      data: data.data || {},
      vibrate: [100, 50, 100],
      actions: [
        { action: "view", title: "Voir" },
        { action: "dismiss", title: "Ignorer" },
      ],
    })
  );
});

// ─── Notification Click Handler ──────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const urlToOpen = event.notification.data?.url || "/pwa";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if possible
      for (const client of clientList) {
        if (client.url.includes("/pwa") && "focus" in client) {
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(urlToOpen);
    })
  );
});
