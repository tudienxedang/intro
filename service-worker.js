// service-worker.js - SIMPLE BUT WORKING
const CACHE_NAME = 'xodang-v1.0';
const OFFLINE_URL = 'offline.html';

// Bước 1: INSTALL - Cache các file quan trọng
self.addEventListener('install', event => {
  console.log('📦 Service Worker đang cài đặt...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('✅ Cache mở thành công');
      
      // Chỉ cache những file CƠ BẢN, chắc chắn có
      return cache.addAll([
        './',
        './index.html',
        './manifest.json',
        // Thêm CSS/JS của mày nếu có
        // './css/style.css',
        // './js/app.js'
      ]).then(() => {
        console.log('✅ Đã cache xong các file cơ bản');
        return self.skipWaiting();
      });
    }).catch(error => {
      console.error('❌ Lỗi khi cache:', error);
    })
  );
});

// Bước 2: ACTIVATE - Xóa cache cũ
self.addEventListener('activate', event => {
  console.log('🔥 Service Worker đang kích hoạt...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log(`🗑️ Xóa cache cũ: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker đã sẵn sàng!');
      return self.clients.claim();
    })
  );
});

// Bước 3: FETCH - Xử lý request
self.addEventListener('fetch', event => {
  // Chỉ xử lý GET request
  if (event.request.method !== 'GET') return;
  
  // Bỏ qua chrome-extension
  if (event.request.url.includes('chrome-extension')) return;
  
  // URL của request
  const url = new URL(event.request.url);
  
  // Network first cho API/CDN, Cache first cho static files
  if (url.pathname.includes('/api/') || url.hostname !== self.location.hostname) {
    // CDN & API: Network first
    event.respondWith(
      fetch(event.request)
        .then(response => response)
        .catch(() => {
          // Offline thì thôi
          return new Response('Không có kết nối mạng');
        })
    );
  } else {
    // Static files: Cache first
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            console.log(`📦 Cache hit: ${event.request.url}`);
            return cachedResponse;
          }
          
          return fetch(event.request)
            .then(networkResponse => {
              // Clone response để cache
              const responseToCache = networkResponse.clone();
              
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                  console.log(`💾 Đã cache: ${event.request.url}`);
                })
                .catch(err => console.warn('Không thể cache:', err));
              
              return networkResponse;
            })
            .catch(() => {
              // Offline fallback
              if (event.request.mode === 'navigate') {
                return caches.match('./index.html');
              }
              
              return new Response('Offline', {
                status: 503,
                headers: { 'Content-Type': 'text/plain' }
              });
            });
        })
    );
  }
});
