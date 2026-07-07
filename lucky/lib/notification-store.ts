const KEY = "cloverky:notifications";
const READ_AT_KEY = "cloverky:notifications_read_at";

export type AppNotification = {
  id: string;
  text: string;
  sentAt: string; // ISO string
};

export function loadNotifications(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as AppNotification[];
  } catch {
    return [];
  }
}

export function saveNotification(text: string): AppNotification {
  const item: AppNotification = {
    id: crypto.randomUUID(),
    text,
    sentAt: new Date().toISOString(),
  };
  const list = loadNotifications();
  list.push(item);
  localStorage.setItem(KEY, JSON.stringify(list.slice(-100)));
  window.dispatchEvent(new CustomEvent("cloverky:new-notification"));
  return item;
}

export function deleteNotification(id: string): void {
  const list = loadNotifications().filter((n) => n.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function clearNotifications(): void {
  localStorage.removeItem(KEY);
  localStorage.removeItem(READ_AT_KEY);
}

export function markAllRead(): void {
  localStorage.setItem(READ_AT_KEY, new Date().toISOString());
}

export function getUnreadCount(): number {
  const readAt = localStorage.getItem(READ_AT_KEY);
  if (!readAt) return loadNotifications().length;
  return loadNotifications().filter((n) => n.sentAt > readAt).length;
}
