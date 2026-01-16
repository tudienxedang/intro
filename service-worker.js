// service-worker.js - FIXED VERSION
const CACHE_NAME = 'xodang-app-v3.2.0-final';

// Chỉ cache các tài nguyên nội bộ
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  // Thêm các file CSS/JS local của bạn ở đây
  // './css/style.css',
  // './js/app.js'
];

// Tài nguyên CDN - không cache trong install event
const externalResources = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js'
];

// 1. INSTALL - chỉ cache local resources
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Chỉ cache các file local, xử lý lỗi từng file
      return Promise.allSettled(
        urlsToCache.map(url => {
          return cache.add(url).catch(e => {
            console.warn(`Failed to cache ${url}:`, e);
            return Promise.resolve(); // Không làm hỏng toàn bộ quá trình
          });
        })
      );
    }).then(() => {
      console.log('Service Worker installed successfully');
    })
  );
});

// 2. ACTIVATE
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
  );
});

// 3. FETCH - chiến lược cache-first cho local, network-first cho external
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Bỏ qua non-GET requests và chrome-extension
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension')) return;
  
  // Xử lý tài nguyên từ CDN khác
  const isExternalCDN = externalResources.some(cdnUrl => 
    event.request.url.startsWith(cdnUrl.split('/').slice(0, 3).join('/'))
  );
  
  if (isExternalCDN) {
    // Network-first cho CDN resources
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache response nếu thành công
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache nếu offline
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Cache-first cho local resources
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(networkResponse => {
            // Kiểm tra response hợp lệ
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            
            // Clone response để cache
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseClone);
              })
              .catch(e => console.warn('Cache put failed:', e));
            
            return networkResponse;
          })
          .catch(() => {
            // Fallback cho HTML requests
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('./index.html');
            }
            
            return new Response('Offline', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// 4. BACKGROUND SYNC (tùy chọn)
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag);
});
