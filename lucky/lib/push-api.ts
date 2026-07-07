const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function subscribePush(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const reg = await navigator.serviceWorker.ready;

  const res = await fetch(`${API_BASE}/messenger/push/vapid-public-key`);
  const { publicKey } = (await res.json()) as { publicKey: string };

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const { endpoint, keys } = subscription.toJSON() as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  await fetch(`${API_BASE}/messenger/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint, p256dh: keys.p256dh, auth: keys.auth }),
  });

  return true;
}

export async function unsubscribePush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  const { endpoint, keys } = sub.toJSON() as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  await fetch(`${API_BASE}/messenger/push/unsubscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint, p256dh: keys.p256dh, auth: keys.auth }),
  });

  await sub.unsubscribe();
}

export async function getPushState(): Promise<"granted" | "denied" | "default"> {
  if (!("Notification" in window)) return "denied";
  return Notification.permission;
}
