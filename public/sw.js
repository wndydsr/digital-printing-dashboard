self.addEventListener('push', function (event) {
  const data = event.data ? event.data.json() : {};

  const options = {
    body: data.body || 'Ada pembaruan pesanan!',
    icon: '/icon-192.png',
    badge: '/badge.png',
    data: { 
      url: data.url || 'https://admin.prinora.store/admin/pesanan' 
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Prinora', options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  
  // 🌟 Ambil URL dinamis dari payload notifikasi, fallback ke halaman admin jika kosong
  const targetUrl = event.notification.data && event.notification.data.url 
    ? event.notification.data.url 
    : 'https://admin.prinora.store/admin/pesanan';

  event.waitUntil(
    clients.openWindow(targetUrl)
  );
});