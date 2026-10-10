import { describe, expect, it } from 'vitest';
import { albumQuery, pickAlbumCover } from './album-cover';

const usher = [{ name: 'Usher' }];
const group = (overrides: Record<string, unknown>) => ({
  id: '2f2c3e2d-6b3a-4a52-9a43-3c9d1c3b8e11', title: 'Confessions', 'primary-type': 'Album', 'secondary-types': [], 'artist-credit': usher, ...overrides,
});

describe('album covers', () => {
  it('returns the release-group cover for the original album', () => {
    expect(pickAlbumCover({ 'release-groups': [group({})] }, 'Confessions', 'Usher'))
      .toBe('https://coverartarchive.org/release-group/2f2c3e2d-6b3a-4a52-9a43-3c9d1c3b8e11/front-250');
  });

  it('skips compilations, live albums and other artists before the original', () => {
    const payload = { 'release-groups': [
      group({ id: '00000000-0000-0000-0000-000000000001', title: 'Greatest Hits 2008', 'artist-credit': [{ name: 'Various Artists' }], 'secondary-types': ['Compilation'] }),
      group({ id: '00000000-0000-0000-0000-000000000002', 'secondary-types': ['Live'] }),
      group({ id: '00000000-0000-0000-0000-000000000003', 'artist-credit': [{ name: 'Usher Raymond Tribute Band' }] }),
      group({ id: '00000000-0000-0000-0000-000000000004', 'primary-type': 'Single' }),
      group({ id: '00000000-0000-0000-0000-000000000005' }),
    ] };
    expect(pickAlbumCover(payload, 'Confessions', 'Usher')).toContain('/00000000-0000-0000-0000-000000000005/');
  });

  it('matches titles and artists despite punctuation and case', () => {
    const payload = { 'release-groups': [group({ title: 'Love. Angel. Music. Baby.', 'artist-credit': [{ name: 'Gwen Stefani' }] })] };
    expect(pickAlbumCover(payload, 'love angel music baby', 'gwen stefani', 500)).toMatch(/front-500$/);
  });

  it('returns null for empty, malformed or unsafe results', () => {
    expect(pickAlbumCover({ 'release-groups': [] }, 'Confessions', 'Usher')).toBeNull();
    expect(pickAlbumCover(null, 'Confessions', 'Usher')).toBeNull();
    expect(pickAlbumCover({ 'release-groups': [group({ id: '../../evil' })] }, 'Confessions', 'Usher')).toBeNull();
  });

  it('builds an escaped search query', () => {
    expect(albumQuery('8701', 'Usher')).toBe('releasegroup:"8701" AND artist:"Usher" AND primarytype:album');
    expect(albumQuery('Say "Hi"', 'A\\B')).toBe('releasegroup:"Say \\"Hi\\"" AND artist:"A\\\\B" AND primarytype:album');
  });
});
