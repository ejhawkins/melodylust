// Theme spec for the Melody Lust listening room.
// The agent selects and blends themes; it never invents styling.

export type ThemeId = "hiphop-runway" | "autumn-tartan";

export interface RoomTheme {
  id: ThemeId;
  label: string;
  kind: "genre" | "season";
  palette: { ink: string; surface: string; accent: string; highlight: string; text: string };
  texture: "tartan" | "chrome" | "knit" | "concrete";
  type: { display: string; body: string; display_style: "italic" | "upright" };
  motion: { loader: "belt-and-record" | "chain-link" | "spotlight-walk"; intensity: "calm" | "punchy" };
  copy: {
    tone: string;
    silenceLabel: string;
    listeningLabel: string;
    enterCta: string;
    loadingCaptions: string[];
  };
  content: {
    // Same genre names as song-recommendations.ts: R&B, Hip-hop, Pop, Rock, Electronic.
    genres: string[];
    garmentKeywords: string[];
    evidenceStrengthMin: "contextual" | "quoted-together" | "verified";
    approvedOnly: true;
  };
  // catalogKey is "Title|Artist" and must match an entry in songCatalog (song-recommendations.ts).
  // Never populated from Spotify API responses.
  setlist: { slot: "opener" | "walk-out" | "mid" | "closer"; catalogKey: string; why: string }[];
}

export const hiphopRunway: RoomTheme = {
  id: "hiphop-runway",
  label: "Hip Hop x Runway",
  kind: "genre",
  palette: { ink: "#0b0b0d", surface: "#17171b", accent: "#c9ccd2", highlight: "#e0a458", text: "#f4efe6" },
  texture: "chrome",
  type: { display: "Georgia", body: "system-ui", display_style: "upright" },
  motion: { loader: "chain-link", intensity: "punchy" },
  copy: {
    tone: "Confident, short sentences, fashion-editorial. No slang imitation, no invented quotes.",
    silenceLabel: "Backstage",
    listeningLabel: "Walk-out",
    enterCta: "Enter the walk-out",
    loadingCaptions: ["silver chains, pulled tight", "oversized tailoring, front row", "boots on the runway"],
  },
  content: {
    genres: ["Hip-hop", "R&B"],
    garmentKeywords: ["chain", "leather jacket", "tailored coat", "boots", "silver"],
    evidenceStrengthMin: "quoted-together",
    approvedOnly: true,
  },
  setlist: [
    { slot: "opener", catalogKey: "Love in This Club|Usher feat. Young Jeezy", why: "Late night, Smooth. R&B and Hip-hop." },
    { slot: "walk-out", catalogKey: "Yeah!|Usher feat. Lil Jon & Ludacris", why: "Hype. Documented Off-White moment: the crystal biker suit at the 2024 Super Bowl halftime show." },
    { slot: "mid", catalogKey: "Hollaback Girl|Gwen Stefani", why: "Hype, Rebellious. Pop and Hip-hop." },
    { slot: "closer", catalogKey: "Confessions Part II|Usher", why: "Moody, Late night. R&B." },
  ],
};

export const autumnTartan: RoomTheme = {
  id: "autumn-tartan",
  label: "Autumn Tartan",
  kind: "season",
  palette: { ink: "#14090c", surface: "#4a0f1f", accent: "#7a1530", highlight: "#e0a458", text: "#f4ead9" },
  texture: "tartan",
  type: { display: "Georgia", body: "system-ui", display_style: "italic" },
  motion: { loader: "belt-and-record", intensity: "calm" },
  copy: {
    tone: "Quiet, tactile, a little poetic. Grounded in approved articles only.",
    silenceLabel: "Silence mode",
    listeningLabel: "Listening mode",
    enterCta: "Enter the listening room",
    loadingCaptions: ["knitwear, softly worn in", "tartan, cut to the beat", "silver belts, pulled tight"],
  },
  content: {
    genres: ["Rock"],
    garmentKeywords: ["knitwear", "tartan", "belt", "scarf"],
    evidenceStrengthMin: "contextual",
    approvedOnly: true,
  },
  setlist: [
    { slot: "opener", catalogKey: "Sweet Dreams (Are Made of This)|Marilyn Manson", why: "Moody, Late night. Rock." },
    { slot: "walk-out", catalogKey: "The Beautiful People|Marilyn Manson", why: "Rebellious, Hype. Rock." },
    { slot: "mid", catalogKey: "The Dope Show|Marilyn Manson", why: "Moody, Rebellious. Documented runway moment: the last movement of Thom Browne's Fall/Winter 2017 show." },
    { slot: "closer", catalogKey: "Disposable Teens|Marilyn Manson", why: "Rebellious, Hype. Rock." },
  ],
};

export const ROOM_THEMES: Record<ThemeId, RoomTheme> = {
  "hiphop-runway": hiphopRunway,
  "autumn-tartan": autumnTartan,
};
