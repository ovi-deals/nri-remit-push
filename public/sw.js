// Service worker for NRI Transfer push notifications.
// Lives at the site root (/sw.js) so its scope covers the whole app.
// This file is intentionally plain JS (no build step) — service workers
// can't be bundled/transpiled the way regular app code is.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "NRI Transfer", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "NRI Transfer";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
    tag: data.tag || "nri-transfer-alert", // replaces older notifications with the same tag instead of stacking
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Clicking the notification focuses an existing tab on this site if one is
// open, otherwise opens a new one — rather than always opening a fresh tab.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
