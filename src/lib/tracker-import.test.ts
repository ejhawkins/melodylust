import { describe, expect, it } from 'vitest';
import { articleKey, assignIds, diffTracker, normalizeDate, parseSheetCsv, toTrackerCsv } from './tracker-import';
import { parseEditorialCsv } from './style-search';

const header = 'ID,URL,Publication,Published At,Title,Summary,Categories';
const row = (id: string, url: string, date = '2024-02-11', title = 'Usher in Off-White') =>
  `${id},${url},ELLE,${date},${title},"Usher wore Off-White, with skates.","Fashion, Music"`;

describe('tracker import from the Google Sheet', () => {
  it('accepts sheet exports, including dates the spreadsheet reformatted', () => {
    const { rows, problems } = parseSheetCsv(`﻿${header}\n${row('1', 'https://elle.com/a', '2/11/2024')}\n\n`);
    expect(problems).toEqual([]);
    expect(rows[0]).toMatchObject({ id: '1', published_at: '2024-02-11', summary: 'Usher wore Off-White, with skates.', categories: 'Fashion, Music' });
  });

  it('reports every problem by spreadsheet row number', () => {
    const { problems } = parseSheetCsv([header,
      row('1', 'https://elle.com/a'),
      row('1', 'https://elle.com/b'),
      row('3', 'https://www.elle.com/a/'),
      row('4', 'not a link'),
      row('5', 'https://elle.com/c', 'next tuesday'),
      '6,https://elle.com/d,ELLE,2024-02-11,,Summary,Fashion',
    ].join('\n'));
    expect(problems).toEqual([
      { row: 3, problem: 'ID 1 is also used on row 2' },
      { row: 4, problem: 'Same article as row 2' },
      { row: 5, problem: expect.stringMatching(/url/i) },
      { row: 6, problem: 'Published At "next tuesday" isn\'t a date like 2024-02-11' },
      { row: 7, problem: 'Title is empty' },
    ]);
  });

  it('flags a sheet missing columns', () => {
    expect(parseSheetCsv('ID,URL\n1,https://elle.com/a').problems[0]?.problem).toMatch(/Missing columns/);
  });

  it('numbers new rows after the highest ID', () => {
    const { rows } = parseSheetCsv([header, row('7', 'https://elle.com/a'), row('', 'https://elle.com/b')].join('\n'));
    expect(assignIds(rows).map(r => r.id)).toEqual(['7', '8']);
  });

  it('describes added, changed and removed articles by link', () => {
    const current = parseSheetCsv([header, row('1', 'https://elle.com/a'), row('2', 'https://elle.com/b')].join('\n')).rows;
    const incoming = parseSheetCsv([header, row('1', 'https://www.elle.com/a/', '2024-02-11', 'New title'), row('3', 'https://elle.com/c')].join('\n')).rows;
    const diff = diffTracker(current, incoming);
    expect(diff.added.map(r => r.id)).toEqual(['3']);
    expect(diff.removed.map(r => r.id)).toEqual(['2']);
    expect(diff.changed.map(c => c.after.title)).toEqual(['New title']);
  });

  it('writes a file the site\'s tracker reader accepts', async () => {
    const { default: trackerCsv } = await import('../../data/articles-tracker.csv?raw');
    const { rows, problems } = parseSheetCsv(trackerCsv);
    expect(problems).toEqual([]);
    expect(parseEditorialCsv(toTrackerCsv(rows)).documents).toHaveLength(rows.length);
    expect(normalizeDate('2026-02-30')).toBeNull();
    expect(articleKey('https://www.elle.com/a/?utm=1')).toBe('elle.com/a');
  });
});
