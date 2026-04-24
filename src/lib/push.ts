import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:marcus@redi.as",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export async function sendPush(
  sub: { endpoint: string; auth: string; p256dh: string },
  payload: PushPayload,
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
      JSON.stringify(payload),
    );
    return true;
  } catch {
    return false;
  }
}
