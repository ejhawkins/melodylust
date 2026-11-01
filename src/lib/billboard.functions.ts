import { createServerFn } from "@tanstack/react-start";
import { mapHot100, type Chart } from "./billboard";

// The open Billboard Hot 100 dataset, republished every week as plain JSON (no key needed).
const HOT100 = "https://raw.githubusercontent.com/mhollingshead/billboard-hot-100/main/recent.json";
const CACHE_MS = 3 * 60 * 60 * 1000;
const TIMEOUT_MS = 6000;

export type CoverArt = { image: string; link: string };
export type ChartFeed = { chart: Chart; cover: CoverArt | null } | null;

let cache: { at: number; feed: NonNullable<ChartFeed> } | null = null;

const loose = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** The No. 1's artwork from Apple's public search, linked back to the song; only a real match counts. */
async function coverFor(title: string, artist: string): Promise<CoverArt | null> {
  try {
    const query = new URLSearchParams({ term: `${title} ${artist}`, entity: "song", limit: "5", country: "US" });
    const response = await fetch(`https://itunes.apple.com/search?${query}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return null;
    const { results } = (await response.json()) as { results?: { trackName?: string; artistName?: string; artworkUrl100?: string; trackViewUrl?: string }[] };
    const lead = loose(artist).split(" ")[0] ?? "";
    const hit = results?.find((r) => r.trackName && r.artistName && loose(r.trackName).startsWith(loose(title)) && loose(r.artistName).includes(lead));
    const art = hit?.artworkUrl100;
    if (!art?.startsWith("https://") || !hit?.trackViewUrl?.startsWith("https://")) return null;
    return { image: art.replace(/\/\d+x\d+bb\./, "/600x600bb."), link: hit.trackViewUrl };
  } catch {
    return null;
  }
}

/** This week's Hot 100 (top forty kept, for the notes) and the No. 1's cover. Never throws. */
export const getHot100 = createServerFn({ method: "GET" }).handler(async (): Promise<ChartFeed> => {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.feed;
  try {
    const response = await fetch(HOT100, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Hot 100 feed returned ${response.status}`);
    const chart = mapHot100(await response.json());
    if (!chart) throw new Error("Hot 100 feed was unreadable");
    const lead = chart.entries[0]!;
    const feed = { chart: { date: chart.date, entries: chart.entries.slice(0, 40) }, cover: await coverFor(lead.title, lead.artist) };
    cache = { at: Date.now(), feed };
    return feed;
  } catch (error) {
    console.error("Billboard chart unavailable", error);
    return cache?.feed ?? null;
  }
});
