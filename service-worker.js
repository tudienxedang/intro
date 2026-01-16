// Tên cache
const CACHE_NAME = 'xedang-full-app-v2';

// Các file cần cache (bao gồm cả trang chính)
const urlsToCache = [
  '/', // Trang splash hiện tại
  'https://raw.githubusercontent.com/tudienxedang/tudien/main/twitter-card.png', // Logo
  'https://tudienxedang.github.io/tudien/?verified=true' // Trang chính
];

// Cài đặt Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker: Đang cài đặt và cache tài nguyên...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache đã mở, đang thêm các URL vào cache...');
        
        // Thêm tất cả URL vào cache
        return Promise.all(
          urlsToCache.map(url => {
            return cache.add(url).catch(error => {
              console.log(`Không thể cache ${url}:`, error);
            });
          })
        );
      })
      .then(() => {
        console.log('Tất cả tài nguyên đã được cache thành công');
        return self.skipWaiting(); // Kích hoạt ngay lập tức
      })
  );
});

// Kích hoạt Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker: Đang kích hoạt...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Xóa cache cũ:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker đã sẵn sàng!');
      return self.clients.claim(); // Kiểm soát tất cả clients
    })
  );
});

// Chiến lược cache: Network First, fallback to Cache
self.addEventListener('fetch', event => {
  // Bỏ qua các request không phải HTTP(S)
  if (!event.request.url.startsWith('http')) return;
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Kiểm tra response hợp lệ
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Clone response để cache
        const responseToCache = response.clone();
        
        caches.open(CACHE_NAME)
          .then(cache => {
            // Cache các resource quan trọng
            const shouldCache = 
              event.request.url.includes('tudienxedang.github.io') ||
              event.request.url.includes('twitter-card.png') ||
              urlsToCache.includes(event.request.url);
              
            if (shouldCache) {
              cache.put(event.request, responseToCache);
              console.log('Đã cache:', event.request.url);
            }
          });
          
        return response;
      })
      .catch(() => {
        // Khi offline: trả về từ cache
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              console.log('Đang phục vụ từ cache:', event.request.url);
              return cachedResponse;
            }
            
            // Nếu không có trong cache và là request navigate
            if (event.request.mode === 'navigate') {
              // Trả về trang chính từ cache nếu có
              return caches.match('https://tudienxedang.github.io/tudien/?verified=true')
                .then(mainPage => {
                  if (mainPage) {
                    console.log('Trả về trang chính từ cache');
                    return mainPage;
                  }
                  
                  // Fallback: trả về trang splash
                  return caches.match('/');
                });
            }
            
            // Fallback cho các request khác
            return new Response('Offline - Không có kết nối mạng', {
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

// Xử lý message từ client
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
