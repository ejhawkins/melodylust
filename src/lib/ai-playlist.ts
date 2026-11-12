// The Studio's AI playlist: the reader describes a mood, a look or an occasion and gets a playlist drawn only from songs
// already in their Studio. Client-safe: the input schema, the instructions, the reader that keeps only songs that were
// offered (the model can't add one), and a keyword fallback for when no AI answers. No React, no credentials.
import { z } from "zod";

export const AI_PLAYLIST_LENGTHS = [5, 10, 15] as const;
export type PlaylistCandidate = { id: string; title: string; artist: string; genre?: string | undefined };
export type PlaylistPick = { id: string; why: string };
export type AIPlaylist = { title: string; picks: PlaylistPick[] };
export type AIPlaylistResponse = { status: "ok" | "not_configured" | "rate_limited" | "unavailable"; playlist: AIPlaylist | null };

export const aiPlaylistInputSchema = z.object({
  prompt: z.string().trim().min(2).max(200),
  length: z.number().int().min(3).max(20),
  candidates: z.array(z.object({
    id: z.string().min(1).max(40),
    title: z.string().min(1).max(120),
    artist: z.string().min(1).max(120),
    genre: z.string().max(40).optional(),
  })).min(1).max(300),
});
export type AIPlaylistInput = z.infer<typeof aiPlaylistInputSchema>;

export const AI_PLAYLIST_PROMPT = `You are Melody Lust's music supervisor. The reader describes a mood, a look or an occasion in "prompt".
Choose up to "length" songs for it, only from "candidates", by their "id". Never name a song that is not in candidates.
Order them so the playlist flows. Give a short playlist title (at most 6 words, no quotation marks) and, for each song,
one sentence (at most 14 words) on why it fits the prompt, in plain, editorial English.
Return JSON: {"title": string, "picks": [{"id": string, "why": string}]}.`;

const clean = (text: unknown, max: number) => (typeof text === "string" ? text.replace(/\s+/g, " ").replace(/^["“”']+|["“”']+$/g, "").trim().slice(0, max) : "");

/** Keeps only picks whose id was offered, once each, at most `length`; null when nothing usable came back. */
export function readAIPlaylist(payload: unknown, input: Pick<AIPlaylistInput, "candidates" | "length" | "prompt">): AIPlaylist | null {
  if (!payload || typeof payload !== "object") return null;
  const offered = new Set(input.candidates.map(c => c.id));
  const seen = new Set<string>();
  const raw = (payload as { picks?: unknown }).picks;
  const picks = (Array.isArray(raw) ? raw : []).flatMap((p): PlaylistPick[] => {
    const id = p && typeof p === "object" ? (p as { id?: unknown }).id : undefined;
    if (typeof id !== "string" || !offered.has(id) || seen.has(id)) return [];
    seen.add(id);
    return [{ id, why: clean((p as { why?: unknown }).why, 140) }];
  }).slice(0, input.length);
  if (!picks.length) return null;
  return { title: clean((payload as { title?: unknown }).title, 60) || titleFor(input.prompt), picks };
}

const titleFor = (prompt: string) => {
  const t = prompt.trim().replace(/[.!?]+$/, "");
  return (t.length > 40 ? `${t.slice(0, 40).replace(/\s+\S*$/, "")}…` : t).replace(/^./, c => c.toUpperCase());
};

// Words a reader might use, and the Studio genres they lean toward.
const LEANS: [RegExp, string[], string][] = [
  [/\b(night|club|party|dance|going out|out tonight|neon|disco|glam|sequin)/i, ["Synth-pop", "Disco", "Pop"], "for a night out"],
  [/\b(slow|soft|sunday|rain|quiet|calm|chill|cosy|cozy|coat|knit|morning|tender|late)/i, ["R&B", "Alt"], "for something slower"],
  [/\b(gym|run|workout|hype|energy|power|strut|walk|runway|show|front row)/i, ["Rap", "Pop", "Disco", "Synth-pop"], "for the pace"],
  [/\b(thrift|vintage|retro|70s|80s|groove|funk|denim)/i, ["Funk", "Disco", "Synth-pop"], "for a vintage feel"],
  [/\b(love|romance|date|silk|satin|candle)/i, ["R&B", "Pop"], "for the romance"],
  [/\b(indie|alt|grunge|moody|dark|black)/i, ["Alt", "R&B"], "for the mood"],
];

/** Without an AI: songs scored by the prompt's words — a named artist or title first, then genres the words lean to. */
export function localPlaylist(prompt: string, candidates: readonly PlaylistCandidate[], length: number): AIPlaylist | null {
  const text = prompt.toLowerCase();
  const leans = LEANS.filter(([re]) => re.test(prompt));
  const scored = candidates.map((c, order) => {
    const named = text.includes(c.artist.toLowerCase()) || text.includes(c.title.toLowerCase());
    const lean = leans.find(([, genres]) => c.genre && genres.includes(c.genre));
    const rank = lean ? lean[1].indexOf(c.genre ?? "") : 99;
    return { c, order, score: (named ? 100 : 0) + (lean ? 10 - rank : 0), why: named ? "You named it." : lean ? `${c.genre}, ${lean[2]}.` : "" };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score || a.order - b.order).slice(0, length);
  return scored.length ? { title: titleFor(prompt), picks: scored.map(s => ({ id: s.c.id, why: s.why })) } : null;
}
