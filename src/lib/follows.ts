import { useEffect, useState } from "react";

/** Followed Style Influencers, kept on the reader's device (keyed by one of their board ids). */
export type Follow = { id: string; author: string };
const KEY = "ml-follows"; const EVT = "ml-follows-change";
export function readFollows(): Follow[] { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Follow[]; } catch { return []; } }
export function toggleFollow(list: Follow[], f: Follow): Follow[] {
  return list.some(x => x.author === f.author && x.id === f.id) || list.some(x => x.id === f.id) ? list.filter(x => x.id !== f.id) : [f, ...list];
}
export function setFollow(f: Follow) { const next = toggleFollow(readFollows(), f); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage off */ } window.dispatchEvent(new Event(EVT)); }
export function useFollows() {
  const [list, setList] = useState<Follow[]>([]);
  useEffect(() => { const r = () => setList(readFollows()); r(); window.addEventListener(EVT, r); window.addEventListener("storage", r); return () => { window.removeEventListener(EVT, r); window.removeEventListener("storage", r); }; }, []);
  return list;
}
