// service-worker.js
const CACHE_NAME = 'xodang-intro-v2.1.0';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap'
];

// Cài đặt Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Kích hoạt Service Worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  
  // Xóa cache cũ
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Xử lý fetch requests
self.addEventListener('fetch', event => {
  // Bỏ qua các request không phải GET
  if (event.request.method !== 'GET') return;
  
  // Bỏ qua các request từ Chrome extensions
  if (event.request.url.startsWith('chrome-extension://')) return;
  
  // Xử lý các URL khác nhau
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Không tìm thấy trong cache - fetch từ network
        return fetch(event.request)
          .then(response => {
            // Kiểm tra response hợp lệ
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone response để cache và return
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(error => {
            // Fallback cho offline
            console.log('[Service Worker] Fetch failed; returning offline page', error);
            
            // Nếu là HTML request, trả về trang offline
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('./offline.html');
            }
            
            // Nếu là CSS, JS, font - trả về cached version nếu có
            return caches.match(event.request);
          });
      })
  );
});

// Xử lý message từ client
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Xử lý background sync
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    console.log('[Service Worker] Background sync triggered');
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Hàm đồng bộ dữ liệu khi có kết nối lại
  try {
    // Gửi dữ liệu offline lên server
    console.log('[Service Worker] Syncing offline data...');
    return Promise.resolve();
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
  }
}

// Xử lý push notifications
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received');
  
  const data = event.data ? event.data.text() : 'Có thông báo mới từ ứng dụng học tiếng Xơ Đăng';
  
  const options = {
    body: data,
    icon: '/tudien/icon-192x192.png',
    badge: '/tudien/icon-96x96.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Mở ứng dụng',
        icon: '/tudien/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Đóng',
        icon: '/tudien/icon-96x96.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Học tiếng Xơ Đăng', options)
  );
});

self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click received');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/tudien/')
    );
  }
});
