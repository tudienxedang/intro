// service-worker.js - Bản đơn giản chỉ để chạy offline
const CACHE_NAME = 'xodang-intro-offline-v1';
const OFFLINE_PAGE = '/tudien/intro.html'; // Đổi đường dẫn nếu cần

// Danh sách file CẦN THIẾT để chạy offline
const FILES_TO_CACHE = [
  OFFLINE_PAGE,
  // CSS và JS từ CDN - cache lại để dùng offline
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
];

// Cài đặt Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Cài đặt...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Đang cache các file cần thiết...');
        return cache.addAll(FILES_TO_CACHE)
          .catch((error) => {
            console.log('[Service Worker] Cache error:', error);
          });
      })
      .then(() => {
        console.log('[Service Worker] Đã cài đặt xong');
        return self.skipWaiting();
      })
  );
});

// Kích hoạt Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Đang kích hoạt...');
  
  // Xóa cache cũ nếu có
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Xóa cache cũ:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Đã kích hoạt');
      return self.clients.claim();
    })
  );
});

// Xử lý khi có request
self.addEventListener('fetch', (event) => {
  // Chỉ xử lý GET requests
  if (event.request.method !== 'GET') return;
  
  // Trả về từ cache nếu có
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Nếu có trong cache, trả về
        if (response) {
          console.log('[Service Worker] Đã tải từ cache:', event.request.url);
          return response;
        }
        
        // Nếu không có, tải từ mạng
        console.log('[Service Worker] Tải từ mạng:', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // Không cache response nếu không thành công
            if (!response || response.status !== 200) {
              return response;
            }
            
            // Clone response để cache
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Nếu mạng lỗi và là trang HTML, trả về trang offline
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match(OFFLINE_PAGE);
            }
            
            // Trả về thông báo lỗi đơn giản
            return new Response('Đang offline. Vui lòng kiểm tra kết nối mạng.', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Xử lý message từ trang chính
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_OFFLINE') {
    event.ports[0].postMessage({ isOnline: navigator.onLine });
  }
});