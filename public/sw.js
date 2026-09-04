/* Myschoolbud service worker — Web Push + light offline shell */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'Myschoolbud', body: 'You have a new notification', link: '/dashboard' };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (_) {
    try {
      data.body = event.data ? event.data.text() : data.body;
    } catch (__) {}
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || 'Myschoolbud', {
        body: data.body || '',
        icon: '/assets/logos/agora_main.png',
        badge: '/assets/favicon-32x32.png',
        data: { link: data.link || '/dashboard', notificationId: data.notificationId },
        tag: data.notificationId || data.type || 'agora-notification',
        renotify: true,
        silent: false,
        sound: '/sounds/universfield-new-notification-051-494246.mp3',
      }),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: 'PLAY_NOTIFICATION_SOUND' });
        }
      }),
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/dashboard';
  const url = new URL(link, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
