self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "새 메일", body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title ?? "새 메일", {
      body: payload.body ?? "",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: "mail-inbox",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
