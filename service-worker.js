// service-worker.js - Bản đơn giản chỉ để chạy offline (KHÔNG cache logo)
const CACHE_NAME = 'xodang-intro-offline-v5';

// DANH SÁCH FILE CẦN CACHE - CHỈ NHỮNG THỨ THỰC SỰ CẦN THIẾT
const FILES_TO_CACHE = [
  // File HTML hiện tại
  './intro.html',  // Hoặc '/' nếu là trang chính
  
  // CSS và JS từ CDN - nhưng sẽ cache với fallback
  // CHÚ Ý: Chỉ cache bằng tay chứ không dùng cache.addAll()
];

// Cài đặt Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Đang cài đặt...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('[Service Worker] Đang cache file cần thiết...');
        
        // Cache file HTML hiện tại
        try {
          await cache.add('./intro.html');
          console.log('✅ Đã cache intro.html');
        } catch (error) {
          console.warn('Không cache được HTML:', error);
        }
        
        // KHÔNG cache các CDN nữa - để tránh CORS issues
        console.log('[Service Worker] Bỏ qua cache CDN để tránh lỗi CORS');
        
        // Cache một file fallback CSS đơn giản
        const fallbackCSS = new Response(`
          /* CSS Fallback khi offline */
          * { box-sizing: border-box; }
          body { 
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0; 
            padding: 0;
            background: #f3f4f6;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            max-width: 480px;
            padding: 20px;
            text-align: center;
          }
        `, {
          headers: { 'Content-Type': 'text/css' }
        });
        
        await cache.put('/fallback.css', fallbackCSS);
        console.log('✅ Đã tạo fallback CSS');
        
        return cache;
      })
      .then(() => {
        console.log('[Service Worker] Đã cài đặt xong');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] Lỗi cài đặt:', error);
        // Vẫn tiếp tục dù có lỗi
        return self.skipWaiting();
      })
  );
});

// Kích hoạt Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Đang kích hoạt...');
  
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

// Xử lý fetch requests - ĐƠN GIẢN NHẤT
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const isHTMLRequest = event.request.headers.get('accept')?.includes('text/html');
  
  // Chỉ xử lý GET requests
  if (event.request.method !== 'GET') return;
  
  // Strategy: Cache First cho HTML, Network First cho các thứ khác
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Nếu là request HTML và có trong cache
        if (isHTMLRequest && cachedResponse) {
          console.log('✅ Trả HTML từ cache');
          return cachedResponse;
        }
        
        // Nếu không có trong cache hoặc không phải HTML, fetch từ mạng
        return fetch(event.request)
          .then((networkResponse) => {
            // Cache HTML files nếu thành công
            if (isHTMLRequest && networkResponse.ok) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseToCache));
            }
            return networkResponse;
          })
          .catch(async (error) => {
            console.log('❌ Mạng lỗi:', error.message);
            
            // OFFLINE: Xử lý fallback
            if (isHTMLRequest) {
              // Trả về trang HTML từ cache
              const cachedHTML = await caches.match('./intro.html');
              if (cachedHTML) {
                console.log('🌐 Đang offline - trả HTML từ cache');
                return cachedHTML;
              }
            }
            
            // Nếu không phải HTML, trả về fallback đơn giản
            if (url.includes('.css')) {
              return new Response(`
                /* Offline Fallback CSS */
                body { 
                  font-family: Arial, sans-serif; 
                  background: #f3f4f6;
                  color: #111827;
                  margin: 0;
                  padding: 20px;
                }
                * { box-sizing: border-box; }
              `, {
                headers: { 'Content-Type': 'text/css' }
              });
            }
            
            return new Response(`
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <title>Đang Offline</title>
                <style>
                  body { 
                    font-family: Arial, sans-serif; 
                    background: #f3f4f6;
                    color: #111827;
                    margin: 0;
                    padding: 40px 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    text-align: center;
                  }
                  .container {
                    max-width: 500px;
                    background: white;
                    padding: 40px;
                    border-radius: 16px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                  }
                  h1 { color: #059669; margin-bottom: 20px; }
                  button {
                    background: #059669;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                    margin-top: 20px;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>📴 Đang Offline</h1>
                  <p>Ứng dụng đang hoạt động ở chế độ offline.</p>
                  <p>Bạn có thể xem nội dung cơ bản của trang intro.</p>
                  <button onclick="location.reload()">Thử lại</button>
                </div>
              </body>
              </html>
            `, {
              headers: { 'Content-Type': 'text/html' }
            });
          });
      })
  );
});

// Xử lý message từ trang chính
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_CACHE') {
    caches.open(CACHE_NAME).then(cache => {
      cache.keys().then(keys => {
        event.ports[0].postMessage({ 
          cachedFiles: keys.length,
          hasHTML: keys.some(k => k.url.includes('.html'))
        });
      });
    });
  }
});
