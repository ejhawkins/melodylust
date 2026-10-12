// The time half of the Sound × Style engine: which fashion seasons are current, and how far
// along its trend a look is, judged only from the dates of the tracker articles that cite it.
// Pure and browser-safe. Every function takes `today`, so nothing depends on the clock.
// Dates are read in UTC: tracker dates like 2026-02-01 parse as UTC midnight, and local time
// would move them to the day before in the Americas.

export type SeasonCode = `${'SS' | 'AW'}${string}`;
export type Hemisphere = 'north' | 'south';
export type TrendStage = 'early' | 'now' | 'staple' | 'new-to-us' | 'dated';

const DAY = 86400000;
const SIX_MONTHS = 183;
const EIGHTEEN_MONTHS = 548;
const yy = (year: number) => String(year % 100).padStart(2, '0');

/** The season a look was worn in: February to July is SS, August to January is AW. */
export function seasonOf(date: Date): SeasonCode {
  const month = date.getUTCMonth() + 1, year = date.getUTCFullYear();
  if (month === 1) return `AW${yy(year - 1)}`;
  return month <= 7 ? `SS${yy(year)}` : `AW${yy(year)}`;
}

/**
 * What's in stores, what was shown most recently and which shows come next.
 * SS shows run September to October of the year before and deliver January to June.
 * AW shows run February to March and deliver July to December.
 * A show season counts as shown from its first month.
 */
export function fashionCalendar(today: Date, hemisphere: Hemisphere = 'north') {
  const month = today.getUTCMonth() + 1, year = today.getUTCFullYear();
  const latestRunway: SeasonCode = month === 1 ? `SS${yy(year)}` : month <= 8 ? `AW${yy(year)}` : `SS${yy(year + 1)}`;
  const next: SeasonCode = month === 1 ? `AW${yy(year)}` : month <= 8 ? `SS${yy(year + 1)}` : `AW${yy(year + 1)}`;
  // The south wears the opposite half: the northern collection for its weather, from the
  // first delivery after its season starts (southern spring in October → SS of next year).
  const inStore: SeasonCode = hemisphere === 'north'
    ? (month <= 6 ? `SS${yy(year)}` : `AW${yy(year)}`)
    : (month <= 6 ? `AW${yy(year)}` : `SS${yy(year + 1)}`);
  return { inStore, latestRunway, next };
}

/**
 * How far along its trend a look is, from the dates of the articles that cite it.
 * Articles dated after today are ignored. Windows count whole days back from today:
 * the last 90 days are days 0–89, the 90 before are days 90–179.
 */
export function trendStage(articleDates: readonly Date[], today: Date): TrendStage {
  const ages = articleDates.map(date => Math.floor((today.getTime() - date.getTime()) / DAY)).filter(age => age >= 0);
  if (ages.length < 3) return 'new-to-us';
  const recent = ages.filter(age => age < 90).length;
  const before = ages.filter(age => age >= 90 && age < 180).length;
  if (!ages.some(age => age < 365) || (before > 0 && recent <= before / 2)) return 'dated';
  const firstAge = Math.max(...ages);
  if (firstAge < SIX_MONTHS && recent > before) return 'early';
  // A young trend holding steady is current, not yet a staple.
  if (firstAge < EIGHTEEN_MONTHS && recent >= before) return 'now';
  return 'staple';
}
