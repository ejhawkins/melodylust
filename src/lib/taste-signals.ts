// What the reader's saves say about their taste: the music genres of the looks they heart and the songs they save to
// the Want List, and the style genres of the moodboards they heart. Shown on the Style profile beside the quiz's
// answers, never written into them: the quiz stays what the reader said, and this stays what they did.
import type { Like } from "@/lib/likes";
import type { WishItem } from "@/lib/wishlist";

export type TasteSignal = { label: string; count: number };
export type TasteSignals = { music: TasteSignal[]; style: TasteSignal[]; saves: number };

const TOP = 4;

function ranked(counts: Map<string, number>): TasteSignal[] {
  return [...counts].map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, TOP);
}

/** Counts each genre once per saved item, so a song both hearted and saved counts twice, as two signals of taste. */
export function tasteSignals({ likes, wishes, songs, boards }: {
  likes: readonly Like[];
  wishes: readonly WishItem[];
  songs: readonly { caption: string; genres?: readonly string[] | undefined }[];
  boards: readonly { id: string; genres: readonly string[] }[];
}): TasteSignals {
  const music = new Map<string, number>();
  const style = new Map<string, number>();
  const add = (into: Map<string, number>, genres: readonly string[] | undefined) => genres?.forEach(g => into.set(g, (into.get(g) ?? 0) + 1));
  const byCaption = new Map(songs.map(s => [s.caption, s]));
  const byBoard = new Map(boards.map(b => [b.id, b]));
  let saves = 0;
  for (const like of likes) {
    if (like.kind === "look" && byCaption.has(like.key)) { add(music, byCaption.get(like.key)!.genres); saves += 1; }
    if (like.kind === "board" && byBoard.has(like.key)) { add(style, byBoard.get(like.key)!.genres); saves += 1; }
  }
  for (const wish of wishes) {
    if (wish.kind === "song" && byCaption.has(wish.name)) { add(music, byCaption.get(wish.name)!.genres); saves += 1; }
  }
  return { music: ranked(music), style: ranked(style), saves };
}
