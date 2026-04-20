// TerangaFlow Service Worker — Version 2
const CACHE_NAME = 'terangaflow-v2';

// Static assets to pre-cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

// Install event — pre-cache essential static assets and skip waiting
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Silently fail for individual assets that can't be cached
      });
    })
  );
  self.skipWaiting();
});

// Activate event — clean up old caches and claim clients
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
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.otf')
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Strategy: Stale-while-revalidate for departures, stations, and partner pages
  if (
    url.pathname.startsWith('/api/departures/') ||
    url.pathname.startsWith('/api/stations/') ||
    url.pathname.startsWith('/p/')
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Strategy: Network-first for main page and display routes
  if (
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    url.pathname.startsWith('/display/')
  ) {
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
 * Try network first, fall back to cache, then offline fallback page.
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
    return new Response(getOfflineFallbackHTML(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 503,
    });
  }
}

/**
 * Offline fallback HTML page with TerangaFlow branding.
 */
function getOfflineFallbackHTML() {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TerangaFlow — Hors Ligne</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0B0F19;
      color: #F8FAFC;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 420px;
    }
    .icon-wrapper {
      width: 80px;
      height: 80px;
      margin: 0 auto 1.5rem;
      border-radius: 50%;
      background: rgba(6, 182, 212, 0.1);
      border: 2px solid rgba(6, 182, 212, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse 2s ease-in-out infinite;
    }
    .icon-wrapper svg {
      width: 40px;
      height: 40px;
      stroke: #06B6D4;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.3); }
      50% { box-shadow: 0 0 0 16px rgba(6, 182, 212, 0); }
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #F8FAFC;
      margin-bottom: 0.5rem;
    }
    p {
      color: #94A3B8;
      line-height: 1.6;
      font-size: 0.95rem;
    }
    .retry {
      margin-top: 2rem;
      display: inline-block;
      padding: 0.875rem 2rem;
      background: #06B6D4;
      color: #0B0F19;
      border: none;
      border-radius: 0.75rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .retry:hover { background: #22D3EE; }
    .retry:active { transform: scale(0.97); }
    .brand {
      margin-top: 3rem;
      font-size: 0.8rem;
      color: #475569;
      letter-spacing: 0.05em;
    }
    .brand span { color: #06B6D4; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon-wrapper">
      <svg viewBox="0 0 24 24">
        <line x1="1" y1="1" x2="23" y2="23" stroke="#475569" stroke-width="1.5"></line>
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
        <path d="M10.71 5.05A16 16 0 0 1 22.56 9"></path>
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
        <line x1="12" y1="20" x2="12.01" y2="20"></line>
      </svg>
    </div>
    <h1>Hors ligne</h1>
    <p>Impossible de se connecter au serveur. Vérifiez votre connexion internet et réessayez.</p>
    <button class="retry" onclick="window.location.reload()">Réessayer</button>
    <p class="brand"><span>TerangaFlow</span> — L'intelligence des gares du Sénégal</p>
  </div>
</body>
</html>`;
}

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'TerangaFlow', {
      body: data.body,
      icon: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="30" fill="#0B0F19"/><rect x="22" y="68" width="148" height="68" rx="10" fill="#06B6D4"/><circle cx="60" cy="158" r="11" fill="#06B6D4"/><circle cx="60" cy="158" r="5" fill="#0B0F19"/><circle cx="132" cy="158" r="11" fill="#06B6D4"/><circle cx="132" cy="158" r="5" fill="#0B0F19"/></svg>'),
      badge: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><rect width="72" height="72" rx="12" fill="#06B6D4"/><text x="36" y="50" text-anchor="middle" font-size="40" font-family="sans-serif">🚌</text></svg>'),
      data: { url: data.url || '/' },
      tag: data.tag || 'terangaflow-default',
      renotify: true,
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
      const client = clientsList.find((c) => c.url.includes(url));
      if (client) return client.focus();
      return clients.openWindow(url);
    })
  );
});

// Message handler for communication from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: CACHE_NAME });
  }
});
