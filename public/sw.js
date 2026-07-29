self.addEventListener('push', function (event) {
  const data = event.data ? event.data.json() : {};

  const options = {
    body: data.body || 'Ada pembaruan pesanan!',
    icon: '/icon-192.png',
    badge: '/badge.png',
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Prinora', options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow('/admin'));
});