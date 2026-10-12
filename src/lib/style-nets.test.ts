// @vitest-environment node
import { readFileSync } from 'node:fs';
import Papa from 'papaparse';
import { describe, expect, it } from 'vitest';
import { checkStyleNets } from './style-nets';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const trackerIds = Papa.parse<Record<string, string>>(read('../../data/articles-tracker.csv'), { header: true, skipEmptyLines: 'greedy' })
  .data.map(row => row['ID'] ?? '');
const header = 'style,season,signal_type,signal_value,weight,evidence_ids,notes\n';

describe('checkStyleNets', () => {
  it('loads the editors\' nets against the real tracker', () => {
    const report = checkStyleNets(read('../../data/style-nets.csv'), trackerIds);
    expect(report.errors).toEqual([]);
    expect(report.rows).toHaveLength(25);
    expect(report.rows[0]).toMatchObject({ style: 'Grunge', season: 'SS24', signalType: 'print', signalValue: 'Plaid', weight: 3, evidenceIds: ['2', '15'] });
    expect(report.warnings).toContain('Row 2: the quiz doesn\'t offer “Plaid” as a print yet.');
    // The AW26 table covers every style, but none of its rows cite tracker articles yet.
    expect(report.warnings.filter(warning => warning.endsWith('has no signals yet, so the quiz can\'t place anyone there.'))).toEqual([]);
    expect(report.rows.filter(row => row.season === 'AW26')).toHaveLength(21);
    expect(report.warnings.filter(warning => warning.includes('no articles'))).toHaveLength(21);
  });

  it('normalises case, the US spelling of colour and a lowercase season', () => {
    const report = checkStyleNets(`${header}soft glam,ss27,Color,Butter yellow,2,9,\n`, trackerIds);
    expect(report.errors).toEqual([]);
    expect(report.rows[0]).toMatchObject({ style: 'Soft Glam', season: 'SS27', signalType: 'colour' });
  });

  it('rejects rows that cite articles missing from the tracker', () => {
    const report = checkStyleNets(`${header}Grunge,AW26,fabric,Suede,2,"2, 999",\n`, trackerIds);
    expect(report.rows).toEqual([]);
    expect(report.errors).toEqual(['Row 2: article 999 isn\'t in the tracker.']);
  });

  it('rejects bad seasons, types and weights, and repeated rows', () => {
    const report = checkStyleNets(`${header}Grunge,Fall 26,fabric,Suede,2,2,\nGrunge,AW26,vibe,Moody,2,2,\nGrunge,AW26,fabric,Suede,5,2,\nGrunge,AW26,fabric,Suede,2,2,\nGrunge,AW26,Fabric,suede,1,2,\n`, trackerIds);
    expect(report.errors).toEqual([
      'Row 2: season “Fall 26” should look like AW26, SS27, PF27 or RS27.',
      'Row 3: signal_type “vibe” should be one of colour, fabric, print, fit, detail, item, designer, music_genre, artist, image.',
      'Row 4: weight must be 1, 2 or 3.',
      'Row 6: repeats an earlier row for Grunge AW26 fabric “suede”.',
    ]);
    expect(report.rows).toHaveLength(1);
  });

  it('loads a new style and an unsourced signal with warnings', () => {
    const report = checkStyleNets(`${header}Western,AW26,item,Boots,2,,\n`, trackerIds);
    expect(report.errors).toEqual([]);
    expect(report.warnings).toContain('Row 2: “Western” isn\'t one of the Style Matrix styles yet. Adding it means tagging moodboards for it.');
    expect(report.warnings).toContain('Row 2: no articles, so this signal can\'t get a trend stage.');
  });

  it('stops at missing columns', () => {
    expect(checkStyleNets('style,season\nGrunge,AW26\n', trackerIds).errors).toEqual(['The CSV is missing columns: signal_type, signal_value, weight, evidence_ids, notes.']);
  });
});
