/* eslint-disable no-restricted-globals */
self.addEventListener("push", function (event) {
  let data = { title: "Maç hatırlatması", body: "", url: "/" };
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (_) {}
  }
  const options = {
    body: data.body,
    icon: "/callister-logo.png",
    badge: "/callister-logo.png",
    tag: "match-reminder",
    data: { url: data.url || "/" },
    requireInteraction: false,
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
