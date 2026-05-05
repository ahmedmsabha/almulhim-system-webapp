/* يُحمّل عبر workbox importScripts — معالجة Web Push خارج الملف المُولَّد الذي يُستبدل عند كل build */
self.addEventListener('push', (event) => {
  if (!event.data) return
  try {
    const data = event.data.json()
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon || '/icons/icon-192.png',
        badge: '/mulhim-icon.png',
        data: { url: data.url || '/student' },
        dir: 'rtl',
        lang: 'ar',
      })
    )
  } catch {
    /* ignore malformed payload */
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const rawUrl = event.notification.data && event.notification.data.url
  const path = typeof rawUrl === 'string' && rawUrl.length ? rawUrl : '/student'
  const absolute =
    typeof self !== 'undefined' && self.registration && 'scope' in self.registration ?
      new URL(path, self.location.origin).href
    : path

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(path) && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(absolute)
    })
  )
})
