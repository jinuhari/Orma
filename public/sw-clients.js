// Runs inside the service worker. When a new worker takes over, reload open
// windows so an existing install does not keep painting the previous map.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) =>
      Promise.all(clients.map(async (client) => {
        if (!client.url) return
        try { await client.navigate(client.url) } catch { /* next open still loads the new worker */ }
      })),
    ),
  )
})
