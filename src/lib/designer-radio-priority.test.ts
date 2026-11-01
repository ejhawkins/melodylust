import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RADIO_PRIORITIES } from './designer-radio-priority';

const seeded = (file: string) => [...readFileSync(`supabase/migrations/${file}`, 'utf8').matchAll(/\('([a-z0-9-]+)', (\d+)\)/g)]
  .map(([, sourceId, priority]) => [sourceId!, Number(priority)] as const);

describe('Designer radio priorities', () => {
  it('match what the migrations seeded, so an import after migrating gives the same daily order', () => {
    const migrations = Object.fromEntries([...seeded('20261031183000_designer_radio_daily.sql'), ...seeded('20261031200000_designer_radio_variety.sql')]);
    expect(RADIO_PRIORITIES).toEqual(migrations);
  });

  it('are distinct and inside the column’s 1–1000 range', () => {
    const priorities = Object.values(RADIO_PRIORITIES);
    expect(new Set(priorities).size).toBe(priorities.length);
    expect(priorities.every(priority => Number.isInteger(priority) && priority >= 1 && priority <= 1000)).toBe(true);
  });
});
