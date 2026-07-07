import type { Contact } from "@/components/contacts-upload-dialog";

const KEY = "cloverky:contacts";

export function saveContacts(contacts: Contact[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(contacts));
}

export function loadContacts(): Contact[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Contact[]) : [];
  } catch {
    return [];
  }
}

export function mergeContacts(prev: Contact[], incoming: Contact[]): Contact[] {
  const seen = new Set(prev.map((c) => c.email));
  return [...prev, ...incoming.filter((c) => !seen.has(c.email))];
}
