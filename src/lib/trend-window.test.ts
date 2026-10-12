// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { fashionCalendar, seasonOf, trendStage } from './trend-window';

const today = new Date('2026-10-12T00:00:00Z');
const daysAgo = (days: number) => new Date(today.getTime() - days * 86400000);

describe('seasonOf', () => {
  it('reads tracker dates in UTC, so a month edge never slips to the day before', () => {
    expect(seasonOf(new Date('2026-02-01'))).toBe('SS26');
    expect(seasonOf(new Date('2026-07-31'))).toBe('SS26');
    expect(seasonOf(new Date('2025-08-01'))).toBe('AW25');
    expect(seasonOf(new Date('2026-01-31'))).toBe('AW25');
  });
});

describe('fashionCalendar', () => {
  const at = (iso: string, hemisphere?: 'north' | 'south') => fashionCalendar(new Date(`${iso}T12:00:00Z`), hemisphere);

  it('is in AW26 stores with SS27 just shown on 12 October 2026', () => {
    expect(fashionCalendar(today)).toEqual({ inStore: 'AW26', latestRunway: 'SS27', next: 'AW27' });
  });

  it('only counts a show season once its first month arrives', () => {
    expect(at('2026-01-15')).toEqual({ inStore: 'SS26', latestRunway: 'SS26', next: 'AW26' });
    expect(at('2026-03-01')).toEqual({ inStore: 'SS26', latestRunway: 'AW26', next: 'SS27' });
    expect(at('2026-08-01')).toEqual({ inStore: 'AW26', latestRunway: 'AW26', next: 'SS27' });
    expect(at('2026-09-01')).toEqual({ inStore: 'AW26', latestRunway: 'SS27', next: 'AW27' });
  });

  it('gives the southern hemisphere the collection for its weather', () => {
    expect(at('2026-10-12', 'south').inStore).toBe('SS27');
    expect(at('2026-04-01', 'south').inStore).toBe('AW26');
  });
});

describe('trendStage', () => {
  it('needs three articles before it calls a trend', () => {
    expect(trendStage([daysAgo(10), daysAgo(20)], today)).toBe('new-to-us');
  });

  it('ignores articles dated after today', () => {
    expect(trendStage([daysAgo(-30), daysAgo(-20), daysAgo(-10)], today)).toBe('new-to-us');
  });

  it('calls each stage', () => {
    expect(trendStage([daysAgo(100), daysAgo(50), daysAgo(10)], today)).toBe('early');
    expect(trendStage([daysAgo(300), daysAgo(150), daysAgo(80), daysAgo(20)], today)).toBe('now');
    expect(trendStage([daysAgo(600), daysAgo(300), daysAgo(100), daysAgo(10)], today)).toBe('staple');
    expect(trendStage([daysAgo(400), daysAgo(300), daysAgo(100)], today)).toBe('dated');
    expect(trendStage([daysAgo(500), daysAgo(450), daysAgo(400)], today)).toBe('dated');
  });

  it('counts an article exactly 90 days old in the earlier window', () => {
    expect(trendStage([daysAgo(120), daysAgo(90), daysAgo(30), daysAgo(10)], today)).toBe('now');
    expect(trendStage([daysAgo(120), daysAgo(89), daysAgo(10)], today)).toBe('early');
  });

  it('stops calling a trend early at six months and current at eighteen', () => {
    expect(trendStage([daysAgo(182), daysAgo(60), daysAgo(10)], today)).toBe('early');
    expect(trendStage([daysAgo(183), daysAgo(60), daysAgo(10)], today)).toBe('now');
    expect(trendStage([daysAgo(547), daysAgo(60), daysAgo(10)], today)).toBe('now');
    expect(trendStage([daysAgo(548), daysAgo(60), daysAgo(10)], today)).toBe('staple');
  });

  it('keeps a young trend holding steady as current', () => {
    expect(trendStage([daysAgo(150), daysAgo(100), daysAgo(60), daysAgo(10)], today)).toBe('now');
  });
});
