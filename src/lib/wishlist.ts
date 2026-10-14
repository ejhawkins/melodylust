import { useEffect, useState } from "react";

/** image: the provider's own product photo (Farfetch), kept so the Want List can preview real pieces. */
export type WishItem = { id: string; kind: "piece" | "song"; name: string; detail: string; link: string; note: string; from?: string; image?: string };
const KEY = "ml-wishlist";
const EVT = "ml-wishlist-change";

function read(): WishItem[] {
  try { return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as WishItem[]; } catch { return []; }
}
function write(items: WishItem[]) {
  try { window.localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(EVT));
}

// Fired on every save attempt, so the live Want List card can say what was added (or already there).
const ADDED = "ml-wish-added";
export type WishAdded = { item: WishItem; duplicate: boolean };
const announce = (detail: WishAdded) => window.dispatchEvent(new CustomEvent<WishAdded>(ADDED, { detail }));

export function addWish(item: Omit<WishItem, "id">) {
  const items = read();
  const existing = items.find(i => i.kind === item.kind && i.name === item.name && i.from === item.from);
  if (existing) { announce({ item: existing, duplicate: true }); return false; }
  const added = { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
  write([...items, added]);
  announce({ item: added, duplicate: false });
  return true;
}
export function onWishAdded(listener: (event: WishAdded) => void) {
  const handle = (event: Event) => listener((event as CustomEvent<WishAdded>).detail);
  window.addEventListener(ADDED, handle);
  return () => window.removeEventListener(ADDED, handle);
}
export function updateWish(id: string, patch: Partial<WishItem>) { write(read().map(i => (i.id === id ? { ...i, ...patch } : i))); }
export function removeWish(id: string) { write(read().filter(i => i.id !== id)); }

export function useWishlist() {
  const [items, setItems] = useState<WishItem[]>([]);
  useEffect(() => {
    const sync = () => setItems(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); };
  }, []);
  return items;
}

export function exportWishlist(items: WishItem[], format: "csv" | "txt") {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const body = format === "csv"
    ? ["Type,Name,Detail,Link,From,Notes", ...items.map(i => [i.kind, i.name, i.detail, i.link, i.from ?? "", i.note].map(esc).join(","))].join("\n")
    : ["MELODY LUST — MY EDIT", "", "+ PIECES", ...items.filter(i => i.kind === "piece").map(fmt), "", "+ PLAYLIST", ...items.filter(i => i.kind === "song").map(fmt)].join("\n");
  const url = URL.createObjectURL(new Blob([body], { type: format === "csv" ? "text/csv" : "text/plain" }));
  const a = document.createElement("a");
  a.href = url; a.download = `melody-lust-edit.${format}`; a.click();
  URL.revokeObjectURL(url);
}
function fmt(i: WishItem) {
  return [`— ${i.name}${i.detail ? ` · ${i.detail}` : ""}`, i.from && `  for: ${i.from}`, i.link && `  ${i.link}`, i.note && `  ref: ${i.note}`].filter(Boolean).join("\n");
}
