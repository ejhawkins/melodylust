// The taste half of the Sound × Style engine: quiz answers → one sound and one style, and a
// reader's looks narrowed to the current seasons, earliest trend first. Pure and browser-safe.
// Style points from fine-tune chips come from the editors' style nets, never from code.

import { z } from 'zod';
import { profileFields, STYLE_GENRES, styleProfileSchema, type StyleGenre, type StyleProfile } from './style-profile';
import type { StyleNetRow } from './style-nets';
import { fashionCalendar, trendStage, type Hemisphere, type TrendStage } from './trend-window';

export const MUSIC_GENRES = profileFields.find(field => field.key === 'music')!.options;
export const CLEAR_CALL = 0.2;
export const STYLE_PROFILE_V2_KEY = 'ml-style-profile-v2';

export const pairingSchema = z.object({
  sound: z.string().min(1).max(40).nullable(),
  style: z.enum(STYLE_GENRES).nullable(),
  runnerUp: z.enum(STYLE_GENRES).nullable(),
  confidence: z.number().min(0).max(1),
  chosenBy: z.enum(['quiz', 'reader']),
});
export type Pairing = z.infer<typeof pairingSchema>;
export const styleProfileV2Schema = styleProfileSchema.extend({ pairing: pairingSchema.nullable().default(null) });
export type StyleProfileV2 = z.infer<typeof styleProfileV2Schema>;

export type PairingAnswers = {
  /** Genre chips, in the order the reader picked them. */
  genres: readonly string[];
  artistIds: readonly string[];
  /** The genre of each free-text artist or song that matched the catalogue. */
  songGenres: readonly string[];
  /** The style tags of each this-or-that image the reader chose. */
  looks: readonly (readonly StyleGenre[])[];
  tieBreak?: StyleGenre;
  /** Colour, fabric, print, fit, details, item and designer chips. */
  fineTune: readonly string[];
};

const fold = (value: string) => value.normalize('NFKC').trim().toLowerCase();
const ranked = <T extends string>(points: Map<T, number>, order: (key: T) => number) =>
  [...points].filter(([, score]) => score > 0).sort((a, b) => b[1] - a[1] || order(a[0]) - order(b[0]));

export function scorePairing({ answers, nets, artistGenres, today, hemisphere = 'north' }: {
  answers: PairingAnswers; nets: readonly StyleNetRow[]; artistGenres: Readonly<Record<string, readonly string[]>>;
  today: Date; hemisphere?: Hemisphere;
}) {
  const music = new Set<string>(MUSIC_GENRES);
  const sound = new Map<string, number>();
  const addSound = (genre: string, score: number) => { if (music.has(genre)) sound.set(genre, (sound.get(genre) ?? 0) + score); };
  answers.genres.forEach(genre => addSound(genre, 3));
  answers.artistIds.forEach(id => (artistGenres[id] ?? []).forEach(genre => addSound(genre, 2)));
  answers.songGenres.forEach(genre => addSound(genre, 1));
  // A tie goes to the genre the reader picked first, then to the quiz's own order.
  const pickedAt = (genre: string) => { const index = answers.genres.indexOf(genre); return index < 0 ? answers.genres.length + MUSIC_GENRES.indexOf(genre as never) : index; };
  const sounds = ranked(sound, pickedAt);

  const { inStore, latestRunway } = fashionCalendar(today, hemisphere);
  const current = nets.filter(row => row.season === inStore || row.season === latestRunway);
  const style = new Map<StyleGenre, number>(STYLE_GENRES.map(genre => [genre, 0]));
  const addStyle = (genre: StyleGenre, score: number) => style.set(genre, (style.get(genre) ?? 0) + score);
  const stylesWith = (match: (row: StyleNetRow) => boolean) =>
    STYLE_GENRES.filter(genre => current.some(row => row.style === genre && match(row)));
  answers.looks.forEach(tags => new Set(tags).forEach(tag => addStyle(tag, 3)));
  if (answers.tieBreak) addStyle(answers.tieBreak, 3);
  // Each chip counts once per style, however many net rows repeat it.
  new Set(answers.fineTune.map(fold)).forEach(chip => stylesWith(row => row.signalType !== 'music_genre' && fold(row.signalValue) === chip).forEach(genre => addStyle(genre, 1)));
  // The lean: a style whose nets name any of the reader's genres gets 1, once.
  const heard = new Set(sounds.map(([genre]) => fold(genre)));
  stylesWith(row => row.signalType === 'music_genre' && heard.has(fold(row.signalValue))).forEach(genre => addStyle(genre, 1));

  const styles = ranked(style, genre => STYLE_GENRES.indexOf(genre));
  const total = styles.reduce((sum, [, score]) => sum + score, 0);
  const confidence = total ? ((styles[0]?.[1] ?? 0) - (styles[1]?.[1] ?? 0)) / total : 0;
  return {
    sound: sounds[0]?.[0] ?? null,
    soundRunnerUp: sounds[1]?.[0] ?? null,
    style: styles[0]?.[0] ?? null,
    styleRunnerUp: styles[1]?.[0] ?? null,
    confidence,
    // With no style votes there is nothing to break; the reveal shows the sound alone.
    needsTieBreak: total > 0 && confidence < CLEAR_CALL && !answers.tieBreak,
    blend: total > 0 && confidence < CLEAR_CALL && Boolean(answers.tieBreak),
  };
}

const stageOrder: Record<Exclude<TrendStage, 'dated'>, number> = { early: 0, now: 1, staple: 2, 'new-to-us': 3 };

/**
 * Looks from the season in stores (lane "in-store") or the latest runway ("first-look"),
 * each with its trend stage from the tracker articles it cites. Dated looks are dropped.
 * Sorted by stage, then in-store before first-look, then the looks' own order.
 */
export function looksInWindow<T extends { season: string; evidenceIds: readonly string[] }>({ looks, publishedAt, today, hemisphere = 'north' }: {
  looks: readonly T[]; publishedAt: Readonly<Record<string, string>>; today: Date; hemisphere?: Hemisphere;
}) {
  const { inStore, latestRunway } = fashionCalendar(today, hemisphere);
  return looks
    .map((look, index) => ({ look, index, lane: look.season === inStore ? 'in-store' as const : look.season === latestRunway ? 'first-look' as const : null }))
    .filter((entry): entry is typeof entry & { lane: 'in-store' | 'first-look' } => entry.lane !== null)
    .map(entry => {
      const dates = entry.look.evidenceIds.flatMap(id => publishedAt[id] ? [new Date(publishedAt[id])] : []);
      return { ...entry, stage: trendStage(dates, today) };
    })
    .filter((entry): entry is typeof entry & { stage: Exclude<TrendStage, 'dated'> } => entry.stage !== 'dated')
    .sort((a, b) => stageOrder[a.stage] - stageOrder[b.stage] || Number(a.lane === 'first-look') - Number(b.lane === 'first-look') || a.index - b.index)
    .map(({ look, lane, stage }) => ({ ...look, lane, stage }));
}

/** A v1 profile → v2, working out the pairing from the old answers. No this-or-that picks exist
 *  in v1, so the style comes only from fine-tune chips the nets recognise, or is null. */
export function upgradeProfile(v1: StyleProfile, nets: readonly StyleNetRow[], today: Date, artistGenres: Readonly<Record<string, readonly string[]>> = {}): StyleProfileV2 {
  const profile = styleProfileSchema.parse(v1);
  const result = scorePairing({
    answers: {
      genres: profile.music, artistIds: profile.artistPicks.map(artist => artist.id), songGenres: [], looks: [],
      fineTune: [...profile.color, ...profile.material, ...profile.pattern, ...profile.fit, ...profile.details, ...profile.item, ...profile.brand],
    },
    nets, artistGenres, today,
  });
  const pairing = result.sound || result.style
    ? { sound: result.sound, style: result.style, runnerUp: result.styleRunnerUp, confidence: result.confidence, chosenBy: 'quiz' as const }
    : null;
  return styleProfileV2Schema.parse({ ...profile, pairing });
}
