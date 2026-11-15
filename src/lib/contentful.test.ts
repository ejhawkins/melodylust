import { describe, expect, it } from 'vitest';
import { assetUrl, entriesUrl, readStories, richText, storyDate, storyNumber } from './contentful';

const asset = (id: string, url: string, contentType = 'image/jpeg') => ({ sys: { id, type: 'Asset' }, fields: { title: id, file: { url, contentType } } });
const paragraph = (...content: unknown[]) => ({ nodeType: 'paragraph', data: {}, content });
const word = (value: string, marks: unknown[] = []) => ({ nodeType: 'text', value, marks, data: {} });

const reply = {
  sys: { type: 'Array' }, total: 2,
  items: [
    {
      sys: { id: 'story-grime', type: 'Entry', createdAt: '2026-11-01T09:00:00.000Z' },
      fields: {
        title: 'The tracksuit was the press release', genre: 'hip-hop', category: 'Music', date: '2026-11-07',
        intro: 'Grime never needed fashion’s approval.',
        image: { sys: { type: 'Link', linkType: 'Asset', id: 'lead' } },
        body: { nodeType: 'document', data: {}, content: [
          paragraph(word('Grime was made in '), word('east London', [{ type: 'bold' }]), word(' bedrooms.')),
          { nodeType: 'embedded-asset-block', data: { target: { sys: { type: 'Link', linkType: 'Asset', id: 'inline' } } }, content: [] },
          { nodeType: 'unordered-list', data: {}, content: [
            { nodeType: 'list-item', data: {}, content: [paragraph(word('Pirate radio'))] },
            { nodeType: 'list-item', data: {}, content: [paragraph({ nodeType: 'hyperlink', data: { uri: 'https://example.com' }, content: [word('Rinse FM')] })] },
          ] },
        ] },
      },
    },
    { sys: { id: 'story-plain', type: 'Entry', createdAt: '2026-10-02T10:00:00.000Z' }, fields: { title: 'Plain body', genre: 'Hip-Hop', body: 'First paragraph.\n\nSecond paragraph.' } },
    { sys: { id: 'story-empty', type: 'Entry' }, fields: { title: 'No body at all', genre: 'Hip-Hop' } },
  ],
  includes: { Asset: [asset('lead', '//images.ctfassets.net/space/lead/grime.jpg'), asset('inline', '//images.ctfassets.net/space/inline/radio.jpg')] },
};

describe('contentful', () => {
  it('builds the genre query the Delivery API expects, without the token', () => {
    const url = entriesUrl({ space: 'abc123', genre: 'Hip-Hop' });
    expect(url).toMatch(/^https:\/\/cdn\.contentful\.com\/spaces\/abc123\/entries\?content_type=story&fields\.genre\[match\]=Hip-Hop&include=2&/);
    expect(url).not.toMatch(/access_token/);
  });

  it('asks for every story when no genre is chosen, and honours a gateway and an environment', () => {
    const url = entriesUrl({ base: 'https://gateway.example.com/', space: 'abc 123', environment: 'staging' });
    expect(url.startsWith('https://gateway.example.com/spaces/abc%20123/environments/staging/entries?content_type=story&include=2')).toBe(true);
    expect(url).not.toContain('fields.genre');
  });

  it('turns entries into clean story props with the linked image resolved', () => {
    const [story] = readStories(reply);
    expect(story).toMatchObject({ title: 'The tracksuit was the press release', genre: 'Hip-Hop', category: 'Music', date: 'November 07, 2026', intro: 'Grime never needed fashion’s approval.' });
    expect(story?.image).toBe('https://images.ctfassets.net/space/lead/grime.jpg?w=1600&q=80');
    expect(story?.id).toBe(storyNumber('story-grime'));
  });

  it('flattens rich text to paragraphs, keeping the words of marks, links and list items', () => {
    expect(readStories(reply)[0]?.body).toBe('Grime was made in east London bedrooms.\n\nPirate radio\n\nRinse FM');
  });

  it('reads a plain-text body, falls back to its first paragraph for the intro and the entry date for the date', () => {
    const story = readStories(reply)[1];
    expect(story).toMatchObject({ body: 'First paragraph.\n\nSecond paragraph.', intro: 'First paragraph.', date: 'October 02, 2026', category: 'Music', image: '' });
  });

  it('leaves out entries with nothing to read and replies that are not collections', () => {
    expect(readStories(reply).map(s => s.title)).toEqual(['The tracksuit was the press release', 'Plain body']);
    expect(readStories(null)).toEqual([]);
    expect(readStories({ sys: { type: 'Error', id: 'AccessTokenInvalid' }, message: 'nope' })).toEqual([]);
  });

  it('collects images embedded in rich text', () => {
    const assets = new Map<string, unknown>(reply.includes.Asset.map(a => [a.sys.id, a]));
    expect(richText(reply.items[0]?.fields.body, assets).images).toEqual(['https://images.ctfassets.net/space/inline/radio.jpg?w=1600&q=80']);
  });

  it('refuses assets that are not https images', () => {
    expect(assetUrl(asset('pdf', '//assets.ctfassets.net/space/x/lookbook.pdf', 'application/pdf'))).toBe('');
    expect(assetUrl(asset('http', 'http://images.ctfassets.net/space/x/a.jpg'))).toBe('');
    expect(assetUrl(undefined)).toBe('');
  });

  it('gives each entry a stable number clear of the bundled stories', () => {
    expect(storyNumber('story-grime')).toBe(storyNumber('story-grime'));
    expect(storyNumber('story-grime')).not.toBe(storyNumber('story-plain'));
    expect(storyNumber('a')).toBeGreaterThanOrEqual(100_000);
    expect(storyDate('not a date')).toBe('');
  });
});
