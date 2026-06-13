const CACHE = "soknadsbasen-v2";
const OFFLINE_SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(OFFLINE_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  // Slett gamle cache-versjoner og ta kontroll over åpne faner umiddelbart,
  // slik at den forrige (ødelagte) SW-en byttes ut hos eksisterende klienter.
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      );
      await clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Rør aldri cross-origin (Supabase, Stripe, fonts, analytics ...).
  if (url.origin !== self.location.origin) return;

  // VIKTIG: navigasjons- og RSC-forespørsler skal ALDRI proxes av SW-en.
  // Tidligere fanget vi dem og returnerte en syntetisk tom 504 ("Offline")
  // ved enhver transient transport-reject. For en RSC-fetch betyr et tomt
  // svar uten flight-payload at Next-routeren ikke kan rendre siden — det er
  // det som ga "504 (Offline)" + blank /app/cv. La nettleseren håndtere
  // disse selv, så ekte feil bobler opp til appens egne feilgrenser i stedet
  // for en falsk 504.
  const isRsc =
    req.headers.get("RSC") === "1" ||
    req.headers.get("Next-Router-Prefetch") === "1" ||
    url.searchParams.has("_rsc");
  if (req.mode === "navigate" || isRsc) return;

  // Øvrige same-origin GET (statiske assets): network-first med
  // cache-fallback. Fabrikker ALDRI en tom 504 — la heller nettverksfeilen
  // propagere som en vanlig feil (samme oppførsel som uten SW).
  e.respondWith(
    fetch(req).catch(async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      throw new Error("offline");
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
