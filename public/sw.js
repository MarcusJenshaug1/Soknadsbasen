const CACHE = "soknadsbasen-v1";
const OFFLINE_SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(OFFLINE_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // Network-first med cache-fallback. `caches.match` kan returnere undefined
  // (cache-miss); respondWith krever en Response, så fall tilbake til en
  // tom 504 i stedet for å returnere undefined (= "Failed to convert value
  // to 'Response'"-feil i konsollen).
  e.respondWith(
    fetch(e.request).catch(async () => {
      const cached = await caches.match(e.request);
      return (
        cached ??
        new Response("", { status: 504, statusText: "Offline" })
      );
    }),
  );
});

self.addEventListener("push", (e) => {
  if (!e.data) return;
  const data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title ?? "Søknadsbasen", {
      body: data.body ?? "",
      icon: "/icons/192",
      badge: "/icons/192",
      tag: data.tag ?? "soknadsbasen",
      data: { url: data.url ?? "/app" },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url ?? "/app";
  e.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        const existing = list.find((c) => c.url.includes(url));
        if (existing) return existing.focus();
        return clients.openWindow(url);
      }),
  );
});
