// The guided story's Opinions step features a real Styling Note: the newest approved one,
// shaped into a short pull quote with its author, song and first photo. Until a note is
// approved (or while Styling Notes can't be reached) the house stylist's note stands in.
import type { StylingNoteView } from "./styling-notes.functions";

export type FeaturedNote = {
  kicker: string;
  quote: string;
  by: string;
  song: string | null;
  image: string | null;
  alt: string;
  fromReaders: boolean;
};

export const HOUSE_NOTE: FeaturedNote = {
  kicker: "Style note",
  quote: "Leather like you're late for soundcheck, straight denim, one gold detail. Let the bassline finish the look.",
  by: "Melody Lust stylist, on the street in Paris",
  song: null,
  image: null,
  alt: "",
  fromReaders: false,
};

const QUOTE_MAX = 150;

/** Cut long ideas at a word boundary so the quote fits the card. */
const clamp = (text: string, max: number) => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max).replace(/[\s,;:.-]+\S*$/, "")}…` : flat;
};

export function featuredNote(notes: readonly StylingNoteView[] | null | undefined): FeaturedNote {
  const note = notes?.find(n => n.status === "approved" && n.styling_idea.trim().length > 0);
  if (!note) return HOUSE_NOTE;
  const photo = note.photo_urls.findIndex(Boolean);
  return {
    kicker: "Featured style note",
    quote: clamp(note.styling_idea, QUOTE_MAX),
    by: `${note.author_display_name.trim() || "A reader"}, in Styling Notes`,
    song: `${note.song_track} — ${note.song_artist}`,
    image: photo >= 0 ? note.photo_urls[photo] ?? null : null,
    alt: (photo >= 0 ? note.photo_alts[photo] : "") || note.title,
    fromReaders: true,
  };
}
