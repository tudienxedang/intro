// service-worker.js - Phiên bản đã sửa lỗi
const CACHE_NAME = 'xodang-app-v4.0.0-fixed'; // Đổi tên để reset cache cũ

// Danh sách file CẦN PHẢI CÓ để app chạy offline
// LƯU Ý: Nếu 1 trong các link này chết, app sẽ không cache được.
const urlsToCache = [
  './', 
  './index.html',
  './manifest.json',
  // Các thư viện bên ngoài (External CDN)
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js'
];

// 1. Cài đặt (Install)
self.addEventListener('install', event => {
  console.log('[Service Worker] Đang cài đặt phiên bản mới...');
  // Bắt buộc Service Worker mới kích hoạt ngay lập tức
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Đang tải tài nguyên vào cache...');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('[Service Worker] Lỗi khi cache file:', err);
      })
  );
});

// 2. Kích hoạt (Activate) - Dọn dẹp cache cũ
self.addEventListener('activate', event => {
  console.log('[Service Worker] Đang kích hoạt...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Xóa tất cả cache cũ không phải là phiên bản hiện tại
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Đang xóa cache cũ:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. Xử lý yêu cầu mạng (Fetch)
self.addEventListener('fetch', event => {
  // Chỉ xử lý method GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // A. Có trong cache -> Trả về ngay (Nhanh nhất)
        if (response) {
          return response;
        }

        // B. Không có trong cache -> Tải từ mạng
        return fetch(event.request).then(networkResponse => {
          // Kiểm tra xem phản hồi có hợp lệ không
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Clone response để lưu vào cache cho lần sau
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        });
      })
      .catch(() => {
        // C. Mất mạng và không có trong cache -> Hiển thị trang offline (nếu có)
        // Hiện tại ta sẽ để mặc định trình duyệt báo lỗi
        console.log('[Service Worker] Không có mạng và không có cache cho: ', event.request.url);
      })
  );
});
