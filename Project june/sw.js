/* GoalPad Service Worker Caching Script */

const CACHE_NAME = 'goalpad-v1';

// Static resources assets list
const ASSETS = [
  'index.html',
  'login.html',
  'signup.html',
  'dashboard.html',
  'daily.html',
  'weekly.html',
  'monthly.html',
  'reminders.html',
  'profile.html',
  'css/style.css',
  'css/theme.css',
  'css/animations.css',
  'css/responsive.css',
  'js/storage.js',
  'js/auth.js',
  'js/goals.js',
  'js/proof.js',
  'js/reminders.js',
  'js/charts.js',
  'js/export.js',
  'js/app.js',
  'manifest.json'
];

// Cache assets on installation
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Clean old caches on activation
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercept network requests to serve from cache when offline
self.addEventListener('fetch', event => {
  // Only handle GET requests and skip browser extensions/external schemes (like chrome-extension:// or file://)
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(networkResponse => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // Cache newly visited local resource
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return networkResponse;
          })
          .catch(() => {
            // Fallback actions or return offline assets
          });
      })
  );
});
