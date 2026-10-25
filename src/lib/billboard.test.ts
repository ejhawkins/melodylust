import { describe, expect, it } from 'vitest';
import { acts, chartDateLabel, chartDeck, chartNotes, chartWeek, entryNote, indexNotes, inWords, leadLabel, listenLink, mapHot100, movement, type ChartEntry } from './billboard';

// The Hot 100 dated October 24, 2026, as the open dataset publishes it (abridged).
const raw = { date: '2026-10-24', data: [
  { song: 'Patient Zero', artist: 'Taylor Swift', this_week: 1, last_week: 1, peak_position: 1, weeks_on_chart: 3 },
  { song: "Choosin' Texas", artist: 'Ella Langley', this_week: 2, last_week: 2, peak_position: 1, weeks_on_chart: 52 },
  { song: 'Dracula', artist: 'Tame Impala & JENNIE', this_week: 5, last_week: 6, peak_position: 5, weeks_on_chart: 55 },
  { song: 'Nicole Kidman', artist: 'ADELA', this_week: 6, last_week: 9, peak_position: 6, weeks_on_chart: 6 },
  { song: 'Be Her', artist: 'Ella Langley', this_week: 13, last_week: 15, peak_position: 2, weeks_on_chart: 35 },
  { song: 'Loving Life Again', artist: 'Ella Langley', this_week: 16, last_week: 19, peak_position: 16, weeks_on_chart: 30 },
  { song: 'Jaded', artist: 'Koe Wetzel & Ella Langley', this_week: 18, last_week: 24, peak_position: 18, weeks_on_chart: 10 },
  { song: 'Solar Eclipse', artist: 'Drake & Don Toliver', this_week: 19, last_week: 5, peak_position: 5, weeks_on_chart: 2 },
  { song: "I Can't Love You Anymore", artist: 'Ella Langley & Morgan Wallen', this_week: 20, last_week: 22, peak_position: 4, weeks_on_chart: 25 },
  { song: 'Stop the Wedding!', artist: 'Ashe', this_week: 34, last_week: 48, peak_position: 34, weeks_on_chart: 7 },
  { song: 'First Light', artist: 'New Act', this_week: 41, last_week: null, peak_position: 41, weeks_on_chart: 1 },
] };
const chart = mapHot100(raw)!;
const at = (pos: number) => chart.entries.find(e => e.pos === pos)!;

describe('mapHot100', () => {
  it('reads the dataset into entries in chart order', () => {
    expect(chart.date).toBe('2026-10-24');
    expect(chart.entries[0]).toEqual({ pos: 1, title: 'Patient Zero', artist: 'Taylor Swift', lastWeek: 1, peak: 1, weeks: 3 });
    expect(at(41).lastWeek).toBeNull();
  });

  it('turns away anything that is not a chart', () => {
    expect(mapHot100(null)).toBeNull();
    expect(mapHot100({ date: 'yesterday', data: [] })).toBeNull();
    expect(mapHot100({ date: '2026-10-24', data: [{ song: '', artist: 'x', this_week: 1 }] })).toBeNull();
  });
});

describe('movement and labels', () => {
  it('marks climbs, falls, holds, debuts and re-entries', () => {
    expect(movement(at(5))).toEqual({ kind: 'up', by: 1, label: '▲ 1' });
    expect(movement(at(19))).toEqual({ kind: 'down', by: 14, label: '▼ 14' });
    expect(movement(at(1))).toEqual({ kind: 'same', label: '—' });
    expect(movement(at(41)).label).toBe('New');
    expect(movement({ ...at(41), weeks: 9 }).label).toBe('Re-entry');
  });

  it('dates the edition without timezone drift', () => {
    expect(chartDateLabel('2026-10-24')).toBe('October 24, 2026');
    expect(chartWeek('2026-10-24')).toBe(43);
    expect(chartWeek('2026-01-01')).toBe(1);
  });

  it('labels the No. 1 by what it did this week', () => {
    expect(leadLabel(at(1))).toBe('Holding at the top');
    expect(leadLabel({ ...at(1), lastWeek: null })).toBe('Debuts at the top');
    expect(leadLabel({ ...at(1), lastWeek: 3 })).toBe('Up from No. 3');
  });

  it('writes numbers the way a copy desk does', () => {
    expect(inWords(5)).toBe('five');
    expect(inWords(55)).toBe('fifty-five');
    expect(inWords(40)).toBe('forty');
    expect(inWords(120)).toBe('120');
  });

  it('splits credits into acts, whatever their capitals, but keeps band names whole', () => {
    expect(acts('Karol G with Judeline & rusowsky')).toEqual(['Karol G', 'Judeline', 'rusowsky']);
    expect(acts('Karol G With Judeline & rusowsky')).toEqual(['Karol G', 'Judeline', 'rusowsky']);
    expect(acts('Florence and the Machine')).toEqual(['Florence and the Machine']);
    expect(acts('Tame Impala & JENNIE')).toEqual(['Tame Impala', 'JENNIE']);
  });
});

describe('notes from the chart', () => {
  const notes = chartNotes(chart.entries);
  it('finds the act on the most of the twenty, counting duets', () => {
    expect(notes[0]).toEqual({ figure: 5, title: 'Ella Langley, five times over', body: 'Ella Langley is on five of this week’s twenty.' });
  });

  it('finds the longest road to a new peak, the hard fall and the climb just outside', () => {
    expect(notes.map(n => n.title)).toEqual(['Ella Langley, five times over', 'Fifty-five weeks to peak', 'The week’s hard fall', 'Just outside the twenty']);
    expect(notes[1]!.body).toBe('Tame Impala & JENNIE’s “Dracula” climbs to No. 5, its highest spot yet, fifty-five weeks after it first charted.');
    expect(notes[2]!.body).toBe('Drake & Don Toliver’s “Solar Eclipse” drops fourteen places to No. 19.');
    expect(notes[3]!.body).toBe('Ashe’s “Stop the Wedding!” jumps fourteen places to No. 34. Watch for it here next week.');
  });

  it('stays quiet about what a week does not have', () => {
    const calm: ChartEntry[] = [{ pos: 1, title: 'A', artist: 'One', lastWeek: 1, peak: 1, weeks: 4 }, { pos: 2, title: 'B', artist: 'Two', lastWeek: 2, peak: 2, weeks: 4 }];
    expect(chartNotes(calm)).toEqual([]);
  });

  it('writes the deck from the No. 1 and the week’s headline fact', () => {
    expect(chartDeck(chart.entries)).toBe('The top of this week’s Billboard Hot 100, in chart order. Taylor Swift’s “Patient Zero” holds the front page, and Ella Langley is on five of this week’s twenty.');
  });

  it('keeps the index to the week’s biggest stories, arrivals first', () => {
    const twenty = chart.entries.filter(e => e.pos <= 20);
    expect([...indexNotes(twenty, 2).keys()]).toEqual([18, 6]);
    expect(indexNotes(twenty, 2).get(18)).toBe('A new peak, up six this week.');
    expect([...indexNotes(chart.entries, 2).keys()][0]).toBe(41);
  });

  it('adds a short line under new peaks and new arrivals only', () => {
    expect(entryNote(at(6))).toBe('A new peak, up three this week.');
    expect(entryNote(at(41))).toBe('New on the chart this week.');
    expect(entryNote(at(13))).toBe('');
  });
});

describe('listenLink', () => {
  it('searches Spotify for the song and its lead act', () => {
    expect(listenLink(at(5))).toBe('https://open.spotify.com/search/Dracula%20Tame%20Impala');
  });
});
