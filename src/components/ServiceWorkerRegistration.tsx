"use client";
import { useEffect } from "react";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

async function subscribeToPush(reg: ServiceWorkerRegistration) {
  if (!VAPID_PUBLIC) return;
  try {
    const existing = await reg.pushManager.getSubscription();
    const sub = existing ?? (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    }));
    const json = sub.toJSON();
    if (!json.keys?.auth || !json.keys?.p256dh) return;
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys }),
    });
  } catch {
    // Tillatelse avslått eller feil — stille feil
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = base64.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // Be om push-tillatelse 5 sekunder etter innlasting (ikke ved første sidelast)
      if ("PushManager" in window && VAPID_PUBLIC) {
        setTimeout(() => {
          if (Notification.permission === "default") {
            Notification.requestPermission().then((perm) => {
              if (perm === "granted") subscribeToPush(reg);
            });
          } else if (Notification.permission === "granted") {
            subscribeToPush(reg);
          }
        }, 5000);
      }
    });
  }, []);
  return null;
}
