import { useEffect, useState } from "react";

/** A quick favourite: a look, music video, moodboard or story the reader hearted, so it sits in the listening room's
 *  library. Kept on this device, like the Want List; the key is the item's own stable id (a song caption, a YouTube id,
 *  a moodboard id or a story id), never its position in a list. */
export type LikeKind = "look" | "video" | "board" | "story" | "playlist" | "runway" | "fashion";
/** title/sub/image: a snapshot so the Favourites shelf can show the item without looking it up again. */
export type LikeMeta = { title?: string; sub?: string; image?: string };
export type Like = { kind: LikeKind; key: string; at: number } & LikeMeta;

const KEY = "ml-likes";
const EVT = "ml-likes-change";
const KINDS: readonly LikeKind[] = ["look", "video", "board", "story", "playlist", "runway", "fashion"];

const isLike = (value: unknown): value is Like => {
  const v = value as Partial<Like> | null;
  return typeof v === "object" && v !== null && KINDS.includes(v.kind as LikeKind) && typeof v.key === "string" && typeof v.at === "number";
};

export function readLikes(): Like[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isLike) : [];
  } catch { return []; }
}
function write(likes: Like[]) {
  try { window.localStorage.setItem(KEY, JSON.stringify(likes)); } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(EVT));
}

export const isLiked = (likes: readonly Like[], kind: LikeKind, key: string) => likes.some(l => l.kind === kind && l.key === key);

/** Hearts or un-hearts an item; returns whether it is liked now. */
export function toggleLike(kind: LikeKind, key: string, meta: LikeMeta = {}) {
  const likes = readLikes();
  if (isLiked(likes, kind, key)) { write(likes.filter(l => !(l.kind === kind && l.key === key))); return false; }
  write([...likes, { ...meta, kind, key, at: Date.now() }]);
  return true;
}

/** The reader's likes, newest first, kept in step across components and tabs. */
export function useLikes() {
  const [likes, setLikes] = useState<Like[]>([]);
  useEffect(() => {
    const sync = () => setLikes(readLikes().sort((a, b) => b.at - a.at));
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); };
  }, []);
  return likes;
}
