import { useEffect, useState } from "react";

export type WishItem = { id: string; kind: "piece" | "song"; name: string; detail: string; link: string; note: string; from?: string };
const KEY = "ml-wishlist";
const EVT = "ml-wishlist-change";

function read(): WishItem[] {
  try { return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as WishItem[]; } catch { return []; }
}
function write(items: WishItem[]) {
  try { window.localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(EVT));
}

export function addWish(item: Omit<WishItem, "id">) {
  const items = read();
  if (items.some(i => i.kind === item.kind && i.name === item.name && i.from === item.from)) return false;
  write([...items, { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }]);
  return true;
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
