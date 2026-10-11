import { describe, expect, it } from 'vitest';
import { pickPortraitPage, portraitCandidates, readPortraitImage } from './artist-portrait';

const page = (title: string, extra: Record<string, unknown>) => ({ title, ...extra });
const wiki = (pages: Record<string, unknown>[], extra: Record<string, unknown> = {}) => ({ query: { ...extra, pages: Object.fromEntries(pages.map((p, i) => [String(i + 1), p])) } });

describe('choosing a portrait page', () => {
  it('takes the plain name when it is a musician with a lead image', () => {
    const payload = wiki([page('Gwen Stefani', { description: 'American singer (born 1969)', pageimage: 'Gwen_2019.jpg' })]);
    expect(pickPortraitPage(payload, portraitCandidates('Gwen Stefani'))).toEqual({ title: 'Gwen Stefani', file: 'Gwen_2019.jpg' });
  });

  it('skips disambiguation pages and non-musician pages, falling back to "(singer)" etc.', () => {
    const payload = wiki([
      page('Usher', { pageprops: { disambiguation: '' }, description: 'Topics referred to by the same term' }),
      page('Usher (musician)', { description: 'American singer (born 1978)', pageimage: 'Usher_2015.jpg' }),
      page('Prince', { description: 'Royal title', pageimage: 'Crown.jpg' }),
    ]);
    expect(pickPortraitPage(payload, portraitCandidates('Usher'))).toEqual({ title: 'Usher (musician)', file: 'Usher_2015.jpg' });
    expect(pickPortraitPage(payload, ['Prince'])).toBeNull();
  });

  it('follows Wikipedia redirects and ignores missing pages or pages without a free image', () => {
    const payload = wiki([page('Charli XCX', { description: 'English singer-songwriter (born 1992)', pageimage: 'Charli.jpg' }), page('Nobody (band)', { missing: '' })],
      { redirects: [{ from: 'Charli Xcx', to: 'Charli XCX' }] });
    expect(pickPortraitPage(payload, ['Charli Xcx'])).toEqual({ title: 'Charli XCX', file: 'Charli.jpg' });
    expect(pickPortraitPage(wiki([page('Kid Cudi', { description: 'American rapper' })]), ['Kid Cudi'])).toBeNull();
    expect(pickPortraitPage(null, ['Usher'])).toBeNull();
  });
});

describe('accepting a portrait image', () => {
  const imageinfo = (license: string, thumburl = 'https://upload.wikimedia.org/thumb/a/ab/Usher.jpg/320px-Usher.jpg') => ({ query: { pages: { '-1': { imageinfo: [{
    thumburl, descriptionurl: 'https://commons.wikimedia.org/wiki/File:Usher.jpg',
    extmetadata: { LicenseShortName: { value: license }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/2.0' }, Artist: { value: '<a href="//x">Jane Doe</a>' } },
  }] } } } });

  it('keeps freely licensed photos with their credit, tags stripped', () => {
    expect(readPortraitImage(imageinfo('CC BY-SA 2.0'), 'Usher')).toEqual({
      name: 'Usher', imageUrl: 'https://upload.wikimedia.org/thumb/a/ab/Usher.jpg/320px-Usher.jpg', author: 'Jane Doe',
      license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Usher.jpg',
    });
    expect(readPortraitImage(imageinfo('Public domain'), 'Usher')).not.toBeNull();
    expect(readPortraitImage(imageinfo('CC0'), 'Usher')).not.toBeNull();
    expect(readPortraitImage(imageinfo('CC BY 4.0', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Usher.jpg/320px-Usher.jpg'), 'Usher')).not.toBeNull();
  });

  it('refuses non-free or unexpected images', () => {
    expect(readPortraitImage(imageinfo('Fair use'), 'Usher')).toBeNull();
    expect(readPortraitImage(imageinfo('CC BY-NC 2.0'), 'Usher')).toBeNull();
    expect(readPortraitImage(imageinfo('CC BY 4.0', 'https://example.com/x.jpg'), 'Usher')).toBeNull();
    expect(readPortraitImage({}, 'Usher')).toBeNull();
  });
});
