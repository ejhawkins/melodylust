import { describe, expect, it } from 'vitest';
import { songCatalog } from '../song-recommendations';
import { ROOM_THEMES } from './theme-spec';

const catalogKeys = new Set(songCatalog.map(song => `${song.title}|${song.artist}`));

describe('room theme setlists', () => {
  for (const theme of Object.values(ROOM_THEMES)) {
    it(`${theme.id}: every catalogKey exists in songCatalog`, () => {
      for (const entry of theme.setlist) expect(catalogKeys.has(entry.catalogKey)).toBe(true);
    });
    it(`${theme.id}: has one song per slot and only approved content`, () => {
      expect(theme.setlist.map(entry => entry.slot)).toEqual(['opener', 'walk-out', 'mid', 'closer']);
      expect(theme.content.approvedOnly).toBe(true);
    });
  }
});
