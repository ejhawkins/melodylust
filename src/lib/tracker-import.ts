// Importing the Articles Tracker from its master copy, the editor's Google Sheet.
// Pure (papaparse + zod only) so the import script can run it with plain Node:
// check every row, tidy what spreadsheets mangle, and describe exactly what would change.

import Papa from 'papaparse';
import { z } from 'zod';

export type TrackerRow = { id: string; url: string; publication: string; published_at: string; title: string; summary: string; categories: string };
export type RowProblem = { row: number; problem: string };

const COLUMNS = ['id', 'url', 'publication', 'published_at', 'title', 'summary', 'categories'] as const;
const HEADER = ['ID', 'URL', 'Publication', 'Published At', 'Title', 'Summary', 'Categories'];

/** Spreadsheets turn 2024-02-11 into 2/11/2024 on export; both mean the same day. */
export function normalizeDate(value: string) {
  const text = value.trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  const us = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const [year, month, day] = iso ? [iso[1]!, iso[2]!, iso[3]!] : us ? [us[3]!, us[1]!.padStart(2, '0'), us[2]!.padStart(2, '0')] : [];
  if (!year) return null;
  const date = `${year}-${month}-${day}`;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().startsWith(date) ? date : null;
}

const rowSchema = z.object({
  url: z.string().url().max(2000).refine(value => /^https?:\/\//.test(value), 'URL must start with http:// or https://'),
  publication: z.string().min(1, 'Publication is empty').max(200),
  title: z.string().min(1, 'Title is empty').max(600),
  summary: z.string().max(5000, 'Summary is over 5,000 characters'),
  categories: z.string().max(2000).refine(value => value.split(',').map(c => c.trim()).filter(Boolean).length <= 30, 'More than 30 categories'),
});

/** Same article however it was linked: https, no www, no query/fragment, no trailing slash. */
export function articleKey(url: string) {
  try { const u = new URL(url); return `${u.hostname.toLowerCase().replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}`; }
  catch { return url.trim(); }
}

/** Sheet CSV → checked rows, or a list of problems by spreadsheet row number. */
export function parseSheetCsv(text: string): { rows: TrackerRow[]; problems: RowProblem[] } {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: header => header.trim().toLowerCase().replace(/[\s_]+/g, '_'),
  });
  const missing = COLUMNS.filter(column => !(parsed.meta.fields ?? []).includes(column));
  if (missing.length) return { rows: [], problems: [{ row: 1, problem: `Missing columns: ${missing.join(', ')}` }] };

  const rows: TrackerRow[] = [];
  const problems: RowProblem[] = [];
  const ids = new Map<string, number>();
  const urls = new Map<string, number>();
  parsed.data.forEach((raw, index) => {
    const row = index + 2; // the header is spreadsheet row 1
    const value = (column: (typeof COLUMNS)[number]) => (raw[column] ?? '').trim();
    const date = normalizeDate(value('published_at'));
    if (!date) problems.push({ row, problem: `Published At "${value('published_at')}" isn't a date like 2024-02-11` });
    const checked = rowSchema.safeParse({ url: value('url'), publication: value('publication'), title: value('title'), summary: value('summary'), categories: value('categories') });
    if (!checked.success) problems.push({ row, problem: checked.error.issues[0]?.message ?? 'Invalid row' });
    const id = value('id');
    if (id && ids.has(id)) problems.push({ row, problem: `ID ${id} is also used on row ${ids.get(id)}` });
    if (id) ids.set(id, row);
    const key = articleKey(value('url'));
    if (urls.has(key)) problems.push({ row, problem: `Same article as row ${urls.get(key)}` });
    urls.set(key, row);
    if (date && checked.success) rows.push({ id, url: value('url'), publication: value('publication'), published_at: date, title: value('title'), summary: value('summary'), categories: value('categories') });
  });
  return { rows, problems };
}

/** Rows without an ID get the next free number, after the highest existing one. */
export function assignIds(rows: TrackerRow[]) {
  let next = Math.max(0, ...rows.map(row => Number(row.id) || 0)) + 1;
  return rows.map(row => (row.id ? row : { ...row, id: String(next++) }));
}

export type TrackerDiff = { added: TrackerRow[]; removed: TrackerRow[]; changed: { before: TrackerRow; after: TrackerRow }[]; unchanged: number };

/** What the import would do to the site's tracker, matched by article link. */
export function diffTracker(current: TrackerRow[], incoming: TrackerRow[]): TrackerDiff {
  const before = new Map(current.map(row => [articleKey(row.url), row]));
  const after = new Map(incoming.map(row => [articleKey(row.url), row]));
  const same = (a: TrackerRow, b: TrackerRow) => COLUMNS.every(column => a[column] === b[column]);
  const diff: TrackerDiff = { added: [], removed: [], changed: [], unchanged: 0 };
  for (const [key, row] of after) {
    const old = before.get(key);
    if (!old) diff.added.push(row);
    else if (same(old, row)) diff.unchanged += 1;
    else diff.changed.push({ before: old, after: row });
  }
  for (const [key, row] of before) if (!after.has(key)) diff.removed.push(row);
  return diff;
}

const cell = (value: string) => (/[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

/** Rows → the site's tracker file format. */
export const toTrackerCsv = (rows: TrackerRow[]) =>
  [HEADER, ...rows.map(row => COLUMNS.map(column => row[column]))].map(values => values.map(cell).join(',')).join('\n') + '\n';
