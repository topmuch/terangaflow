// SmartTicketQR Service Worker — Version 1
const CACHE_NAME = 'smartticketqr-v1';

// Static assets to pre-cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

// Install event — pre-cache essential static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately without waiting for old SW to finish
  self.skipWaiting();
});

// Activate event — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event — route requests to appropriate caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Strategy: Cache-first for Next.js static assets and fonts
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.includes('/fonts/') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.otf')
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Strategy: Stale-while-revalidate for API responses
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Strategy: Network-first for the main page
  if (url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Default: network-first for everything else
  event.respondWith(networkFirst(request));
});

/**
 * Cache-first strategy:
 * Return cached response if available, otherwise fetch and cache.
 */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return a basic offline response for static assets
    return new Response('', { status: 408, statusText: 'Offline' });
  }
}

/**
 * Stale-while-revalidate strategy:
 * Return cached response immediately, then update cache in background.
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // Fetch in background to update cache
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => {
      // Network failed, return the cached version below
      return null;
    });

  // Return cached if available, otherwise wait for network
  if (cachedResponse) {
    return cachedResponse;
  }

  return fetchPromise;
}

/**
 * Network-first strategy:
 * Try network first, fall back to cache.
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline fallback page
    return new Response(
      `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartTicketQR — Hors Ligne</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e5e5e5; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .container { text-align: center; padding: 2rem; max-width: 400px; }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { font-size: 1.5rem; color: #10b981; margin-bottom: 0.5rem; }
    p { color: #a3a3a3; line-height: 1.6; }
    .retry { margin-top: 1.5rem; display: inline-block; padding: 0.75rem 1.5rem; background: #10b981; color: #0a0a0a; border: none; border-radius: 0.5rem; font-size: 1rem; font-weight: 600; cursor: pointer; }
    .retry:hover { background: #059669; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🚌</div>
    <h1>Hors Ligne</h1>
    <p>Impossible de se connecter au serveur. Vérifiez votre connexion internet et réessayez.</p>
    <button class="retry" onclick="window.location.reload()">Réessayer</button>
  </div>
</body>
</html>`,
      {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        status: 503,
      }
    );
  }
}
