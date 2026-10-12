// Style nets: the editors' table of what makes each style, one signal per row (a fabric, a
// print, an artist…), each tied to tracker articles. The quiz mapping, the image tags and the
// trend stages are worked out from these rows instead of being hand-written in code.
// Pure and browser-safe: this module only reads and checks the CSV.

import Papa from 'papaparse';
import { profileFields, STYLE_GENRES } from './style-profile';

export const STYLE_NET_COLUMNS = ['style', 'season', 'signal_type', 'signal_value', 'weight', 'evidence_ids', 'notes'] as const;
export const SIGNAL_TYPES = ['colour', 'fabric', 'print', 'fit', 'detail', 'item', 'designer', 'music_genre', 'artist', 'image'] as const;
export type SignalType = typeof SIGNAL_TYPES[number];

/** SS spring/summer, AW autumn/winter, PF pre-fall, RS resort, then the two-digit year. */
const SEASON = /^(SS|AW|PF|RS)\d{2}$/;

// Signal types the quiz already asks about, so a value it doesn't offer can be flagged.
const quizField: Partial<Record<SignalType, typeof profileFields[number]['key']>> = {
  colour: 'color', fabric: 'material', print: 'pattern', fit: 'fit', detail: 'details',
  item: 'item', designer: 'brand', music_genre: 'music',
};

export type StyleNetRow = {
  style: string; season: string; signalType: SignalType; signalValue: string;
  weight: 1 | 2 | 3; evidenceIds: string[]; notes: string;
};
/** Errors stop a row from loading; warnings load it but need an editor's look. */
export type StyleNetReport = { rows: StyleNetRow[]; errors: string[]; warnings: string[] };

const fold = (value: string) => value.normalize('NFKC').trim().toLowerCase();

/** Checks a style-net CSV against the tracker's article IDs. */
export function checkStyleNets(csv: string, trackerIds: readonly string[]): StyleNetReport {
  const report: StyleNetReport = { rows: [], errors: [], warnings: [] };
  if (new TextEncoder().encode(csv).length > 2000000) return { ...report, errors: ['The CSV is over the 2 MB limit.'] };
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: header => header.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[\s_]+/g, '_'),
  });
  if (parsed.errors.length) return { ...report, errors: [`Could not read the CSV: ${parsed.errors[0]?.message}`] };
  const missing = STYLE_NET_COLUMNS.filter(column => !parsed.meta.fields?.includes(column));
  if (missing.length) return { ...report, errors: [`The CSV is missing columns: ${missing.join(', ')}.`] };

  const known = new Set(trackerIds.map(id => id.trim()));
  const seen = new Set<string>();
  parsed.data.forEach((raw, index) => {
    const at = `Row ${index + 2}`;
    const cell = (column: typeof STYLE_NET_COLUMNS[number]) => (raw[column] ?? '').trim();
    const problems: string[] = [];

    const style = STYLE_GENRES.find(genre => fold(genre) === fold(cell('style'))) ?? cell('style');
    if (!style) problems.push(`${at}: style is empty.`);
    else if (!STYLE_GENRES.some(genre => genre === style)) report.warnings.push(`${at}: “${style}” isn't one of the Style Matrix styles yet. Adding it means tagging moodboards for it.`);

    const season = cell('season').toUpperCase();
    if (!SEASON.test(season)) problems.push(`${at}: season “${cell('season')}” should look like AW26, SS27, PF27 or RS27.`);

    const typed = fold(cell('signal_type')).replace(/\s+/g, '_');
    const signalType = SIGNAL_TYPES.find(type => type === (typed === 'color' ? 'colour' : typed));
    if (!signalType) problems.push(`${at}: signal_type “${cell('signal_type')}” should be one of ${SIGNAL_TYPES.join(', ')}.`);

    const signalValue = cell('signal_value');
    if (!signalValue || signalValue.length > 100) problems.push(`${at}: signal_value must be 1 to 100 characters.`);

    const weight = Number(cell('weight'));
    if (![1, 2, 3].includes(weight)) problems.push(`${at}: weight must be 1, 2 or 3.`);

    const evidenceIds = cell('evidence_ids').split(/[\s,]+/).filter(Boolean);
    const unknown = evidenceIds.filter(id => !known.has(id));
    if (unknown.length) problems.push(`${at}: article ${unknown.join(', ')} isn't in the tracker.`);

    const notes = cell('notes');
    if (notes.length > 500) problems.push(`${at}: notes must be 500 characters or fewer.`);

    const key = [style, season, signalType ?? typed, signalValue].map(fold).join('|');
    if (seen.has(key)) problems.push(`${at}: repeats an earlier row for ${style} ${season} ${signalType} “${signalValue}”.`);

    if (problems.length || !signalType) { report.errors.push(...problems); return; }
    seen.add(key);
    if (!evidenceIds.length) report.warnings.push(`${at}: no articles, so this signal can't get a trend stage.`);
    const field = quizField[signalType];
    const options = profileFields.find(entry => entry.key === field)?.options as readonly string[] | undefined;
    if (options && !options.some(option => fold(option) === fold(signalValue))) report.warnings.push(`${at}: the quiz doesn't offer “${signalValue}” as a ${signalType} yet.`);
    report.rows.push({ style, season, signalType, signalValue, weight: weight as 1 | 2 | 3, evidenceIds, notes });
  });

  for (const genre of STYLE_GENRES) {
    if (!report.rows.some(row => row.style === genre)) report.warnings.push(`${genre} has no signals yet, so the quiz can't place anyone there.`);
  }
  return report;
}
