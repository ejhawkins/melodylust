import { describe, expect, it } from 'vitest';
import { goodReadsUrl, readGoodReads, webLink } from './good-reads';

const entry = (id: string, fields: Record<string, unknown>) => ({ sys: { id }, fields });

describe('good reads', () => {
  it('asks Contentful for good reads in the editor’s order, with no token in the URL', () => {
    expect(goodReadsUrl({ space: 'abc', environment: 'master' })).toBe(
      'https://cdn.contentful.com/spaces/abc/environments/master/entries?content_type=goodRead&include=1&order=fields.order,-sys.createdAt&limit=8');
  });

  it('reads entries as links, naming the site when the editor names no source', () => {
    const reads = readGoodReads({
      items: [
        entry('a', { title: 'The return of the music magazine', source: 'The Face', note: 'Print’s quiet comeback.', url: 'https://theface.com/read', image: { sys: { id: 'pic' } } }),
        entry('b', { title: 'Tour wardrobes', url: 'https://www.vogue.com/article/tour' }),
      ],
      includes: { Asset: [{ sys: { id: 'pic' }, fields: { file: { url: '//images.ctfassets.net/s/pic/x.jpg', contentType: 'image/jpeg' } } }] },
    });
    expect(reads[0]).toMatchObject({ id: 'a', title: 'The return of the music magazine', source: 'The Face', note: 'Print’s quiet comeback.', url: 'https://theface.com/read' });
    expect(reads[0]!.image).toMatch(/^https:\/\/images\.ctfassets\.net\/s\/pic\/x\.jpg\?.*w=400/);
    expect(reads[1]).toEqual({ id: 'b', title: 'Tour wardrobes', source: 'vogue.com', note: '', url: 'https://www.vogue.com/article/tour', image: '' });
  });

  it('leaves out reads with no title, no web link or a repeated link', () => {
    const reads = readGoodReads({ items: [
      entry('a', { title: '', url: 'https://a.com' }),
      entry('b', { title: 'Script', url: 'javascript:alert(1)' }),
      entry('c', { title: 'Kept', url: 'https://c.com/x' }),
      entry('d', { title: 'Again', url: 'https://c.com/x' }),
    ] });
    expect(reads.map(r => r.id)).toEqual(['c']);
    expect(readGoodReads(null)).toEqual([]);
  });

  it('only opens http and https links', () => {
    expect(webLink('https://x.com/a b')).toBe('https://x.com/a%20b');
    expect(webLink('data:text/html,hi')).toBe('');
    expect(webLink('not a url')).toBe('');
  });
});
