self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch { payload = { body: 'A new SmartDine offer is available.' }; }
  event.waitUntil(self.registration.showNotification('SmartDine offer nearby', { body: String(payload.body || 'A nearby offer is available.'), tag: 'smartdine-' + String(payload.notificationId || 'offer'), data: { url: '/customer.html' } }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/customer.html'));
});

