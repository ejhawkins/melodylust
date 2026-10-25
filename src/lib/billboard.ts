// The week's Billboard Hot 100, shaped for the front page's broadsheet chart: entries with
// their movement, a headline deck, a label for the No. 1, and "Notes from the chart" worked
// out from the week's numbers. Pure and browser-safe; the fetch lives in billboard.functions.ts.

export type ChartEntry = {
  pos: number;
  title: string;
  artist: string;
  lastWeek: number | null;
  peak: number;
  weeks: number;
};

export type Chart = { date: string; entries: ChartEntry[] };

export type Movement =
  | { kind: "up" | "down"; by: number; label: string }
  | { kind: "same"; label: string }
  | { kind: "new" | "re-entry"; label: string };

export type ChartNote = { title: string; body: string; figure?: number };

type RawEntry = { song?: unknown; artist?: unknown; this_week?: unknown; last_week?: unknown; peak_position?: unknown; weeks_on_chart?: unknown };

const int = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v > 0 ? v : null);
const text = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

/** Reads the open Hot 100 dataset ({ date, data: [...] }); null when it isn't one. */
export function mapHot100(payload: unknown): Chart | null {
  const root = (payload ?? {}) as { date?: unknown; data?: unknown };
  const date = typeof root.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(root.date) ? root.date : null;
  if (!date || !Array.isArray(root.data)) return null;
  const entries = (root.data as RawEntry[])
    .map((e): ChartEntry | null => {
      const pos = int(e.this_week);
      const title = text(e.song);
      const artist = text(e.artist);
      if (!pos || !title || !artist) return null;
      return { pos, title, artist, lastWeek: int(e.last_week), peak: int(e.peak_position) ?? pos, weeks: int(e.weeks_on_chart) ?? 1 };
    })
    .filter((e): e is ChartEntry => e !== null)
    .sort((a, b) => a.pos - b.pos);
  return entries.length ? { date, entries } : null;
}

export function movement(e: ChartEntry): Movement {
  if (e.lastWeek === null) return e.weeks > 1 ? { kind: "re-entry", label: "Re-entry" } : { kind: "new", label: "New" };
  const d = e.lastWeek - e.pos;
  if (d > 0) return { kind: "up", by: d, label: `▲ ${d}` };
  if (d < 0) return { kind: "down", by: -d, label: `▼ ${-d}` };
  return { kind: "same", label: "—" };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "October 24, 2026" — read as a calendar date, so no timezone can shift it. */
export function chartDateLabel(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${d}, ${y}`;
}

/** The chart's week of the year (1–53), for the edition line. */
export function chartWeek(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const day = Date.UTC(y!, (m ?? 1) - 1, d ?? 1);
  return Math.floor((day - Date.UTC(y!, 0, 1)) / 86_400_000 / 7) + 1;
}

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** Numbers as a copy desk writes them: "five", "fifty-five"; figures from one hundred up. */
export function inWords(n: number) {
  if (n < 20) return ONES[n]!;
  if (n < 100) return TENS[Math.floor(n / 10)]! + (n % 10 ? `-${ONES[n % 10]}` : "");
  return String(n);
}
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Splits a credit like "Koe Wetzel & Ella Langley" or "Karol G with Judeline & rusowsky" into acts. */
export function acts(artist: string) {
  // Not "and": it is part of too many band names ("Florence and the Machine").
  return artist.split(/\s+(?:&|x|with|featuring|feat\.|ft\.)\s+|,\s+/i).map((a) => a.trim()).filter(Boolean);
}

/** What the No. 1 has done this week, for the label beside its numeral. */
export function leadLabel(e: ChartEntry) {
  if (e.lastWeek === 1) return "Holding at the top";
  if (e.lastWeek === null) return "Debuts at the top";
  return `Up from No. ${e.lastWeek}`;
}

/** The deck under the headline, from the week's own facts. */
export function chartDeck(entries: readonly ChartEntry[]) {
  const lead = entries[0];
  if (!lead) return "";
  const notes = chartNotes(entries);
  const holds = lead.lastWeek === 1 ? "holds" : "takes";
  const extra = notes.find((n) => n.figure)?.body.replace(/\.$/, "");
  return `The top of this week’s Billboard Hot 100, in chart order. ${lead.artist}’s “${lead.title}” ${holds} the front page${extra ? `, and ${extra}` : ""}.`;
}

/** Up to four notes for the margin, each only when the week has one to tell. */
export function chartNotes(entries: readonly ChartEntry[]): ChartNote[] {
  const top = entries.filter((e) => e.pos <= 20);
  const notes: ChartNote[] = [];

  // The act on the most of the twenty.
  const counts = new Map<string, number>();
  for (const e of top) for (const a of new Set(acts(e.artist))) counts.set(a, (counts.get(a) ?? 0) + 1);
  const [busiest, many] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
  if (many >= 3) notes.push({ figure: many, title: `${busiest}, ${inWords(many)} times over`, body: `${busiest} is on ${inWords(many)} of this week’s twenty.` });

  // The longest road to a new peak this week.
  const climber = top.filter((e) => e.lastWeek !== null && e.pos < e.lastWeek && e.peak === e.pos && e.weeks >= 10).sort((a, b) => b.weeks - a.weeks)[0];
  if (climber) notes.push({ title: `${capital(inWords(climber.weeks))} weeks to peak`, body: `${climber.artist}’s “${climber.title}” climbs to No. ${climber.pos}, its highest spot yet, ${inWords(climber.weeks)} weeks after it first charted.` });

  // The biggest fall inside the twenty.
  const faller = top.filter((e) => movement(e).kind === "down").sort((a, b) => (b.pos - (b.lastWeek ?? b.pos)) - (a.pos - (a.lastWeek ?? a.pos)))[0];
  if (faller && faller.lastWeek && faller.pos - faller.lastWeek >= 3) notes.push({ title: "The week’s hard fall", body: `${faller.artist}’s “${faller.title}” drops ${inWords(faller.pos - faller.lastWeek)} places to No. ${faller.pos}.` });

  // The hottest climb just outside the twenty.
  const outside = entries.filter((e) => e.pos > 20 && e.pos <= 40 && e.lastWeek !== null && e.lastWeek > e.pos).sort((a, b) => (b.lastWeek! - b.pos) - (a.lastWeek! - a.pos))[0];
  if (outside && outside.lastWeek! - outside.pos >= 5) notes.push({ title: "Just outside the twenty", body: `${outside.artist}’s “${outside.title}” jumps ${inWords(outside.lastWeek! - outside.pos)} places to No. ${outside.pos}. Watch for it here next week.` });

  return notes.slice(0, 4);
}

/** A short italic line under a song in the index, when its week deserves one. */
export function entryNote(e: ChartEntry): string {
  const m = movement(e);
  if (m.kind === "new") return "New on the chart this week.";
  if (m.kind === "re-entry") return "Back on the chart this week.";
  if (m.kind === "up" && e.peak === e.pos) return `A new peak, up ${inWords(m.by)} this week.`;
  return "";
}

/** The index's lines, kept to the week's biggest stories: arrivals first, then the largest climbs. */
export function indexNotes(entries: readonly ChartEntry[], max = 4): Map<number, string> {
  const weight = (e: ChartEntry) => { const m = movement(e); return m.kind === "new" || m.kind === "re-entry" ? 1000 : m.kind === "up" ? m.by : 0; };
  const picked = entries.map((e) => ({ e, note: entryNote(e) })).filter((x) => x.note).sort((a, b) => weight(b.e) - weight(a.e) || a.e.pos - b.e.pos).slice(0, max);
  return new Map(picked.map((x) => [x.e.pos, x.note]));
}

/** Opens the song in Spotify's search, the one link that works for every chart entry. */
export const listenLink = (e: Pick<ChartEntry, "title" | "artist">) =>
  `https://open.spotify.com/search/${encodeURIComponent(`${e.title} ${acts(e.artist)[0] ?? e.artist}`)}`;
