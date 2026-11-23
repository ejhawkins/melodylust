import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RUNWAY_TOPICS } from './runway-opinion';

const sql = readFileSync(resolve(process.cwd(), 'drizzle/migrations/0015_runway_opinions.sql'), 'utf8');
const journal = JSON.parse(readFileSync(resolve(process.cwd(), 'drizzle/migrations/meta/_journal.json'), 'utf8')) as { entries: { idx: number; tag: string }[] };

describe('the runway opinions migration', () => {
  it('is the next journal entry', () => {
    expect(journal.entries.at(-1)).toMatchObject({ idx: 15, tag: '0015_runway_opinions' });
  });
  it('adds kind, topic and notes to Styling Notes, with looks as the default', () => {
    expect(sql).toMatch(/ADD COLUMN kind text NOT NULL DEFAULT 'look' CHECK \(kind IN \('look', 'runway_opinion'\)\)/);
    expect(sql).toMatch(/ADD COLUMN topic text/);
    expect(sql).toMatch(/ADD COLUMN extra_notes text NOT NULL DEFAULT '' CHECK \(char_length\(extra_notes\) <= 500\)/);
  });
  it('keeps every topic id within the column check', () => {
    for (const id of Object.keys(RUNWAY_TOPICS)) expect(id).toMatch(/^[a-z0-9-]{1,80}$/);
  });
  it('keeps looks whole and opinions free of songs and photos', () => {
    expect(sql).toMatch(/styling_notes_look_complete CHECK \(kind <> 'look' OR/);
    expect(sql).toMatch(/styling_notes_opinion_complete CHECK \(kind <> 'runway_opinion' OR \(\s*topic <> '' AND song_artist = ''/);
  });
  it('leaves ownership, pending submission and moderator review policies untouched', () => {
    expect(sql).not.toMatch(/POLICY/i);
    expect(sql).not.toMatch(/ALTER COLUMN status|DROP TRIGGER|sync_note_review_metadata|DISABLE ROW LEVEL SECURITY/i);
  });
  it('keeps stylist profiles to looks', () => {
    expect(sql).toMatch(/n\.status = 'approved' AND n\.kind = 'look'/);
  });
});
