import { describe, expect, it } from 'vitest';
import { commonsPhotosUrl, directorNames, portraitDesigners, readCommonsPhotos, readWikipediaPages, wikipediaPagesUrl } from './designer-portraits';
import { DESIGNERS } from './runway-songs';

// A Wikipedia query reply (formatversion 2) for the names below.
const pagesReply = {
  query: {
    normalized: [{ from: 'nicolas ghesquière', to: 'Nicolas ghesquière' }],
    redirects: [{ from: 'Nicolas ghesquière', to: 'Nicolas Ghesquière' }],
    pages: [
      { title: 'Nicolas Ghesquière', description: 'French fashion designer', pageimage: 'Nicholas_Ghesquiere_Paris_Fashion_Week_2019.jpg' },
      { title: 'Jun Takahashi', description: 'Japanese fashion designer (born 1969)', pageimage: 'Jun_Takahashi_dress_for_Undercover.jpg' },
      { title: 'Kim Jones', description: 'Topics referred to by the same name', pageprops: { disambiguation: '' } },
      { title: 'Louis Vuitton', description: 'French luxury fashion house', pageimage: 'Louis_Vuitton_logo.svg' },
      { title: 'Nobody Real', missing: true },
    ],
  },
};
const names = ['nicolas ghesquière', 'Jun Takahashi', 'Kim Jones', 'Louis Vuitton', 'Nobody Real'];

const photosReply = {
  query: {
    pages: [{
      title: 'File:Nicholas Ghesquiere Paris Fashion Week 2019.jpg',
      imageinfo: [{
        thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Nicholas.jpg/400px-Nicholas.jpg',
        descriptionurl: 'https://commons.wikimedia.org/wiki/File:Nicholas_Ghesquiere_Paris_Fashion_Week_2019.jpg',
        extmetadata: { Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:X">Myles Kalus Anak Jihem</a>' }, LicenseShortName: { value: 'CC BY-SA 4.0' } },
      }],
    }],
  },
};

describe('designer portraits', () => {
  it('reads up to two directors from the scout’s free text', () => {
    expect(directorNames('Miuccia Prada & Raf Simons')).toEqual(['Miuccia Prada', 'Raf Simons']);
    expect(directorNames('Richie Hawtin (under his alias Plastikman)')).toEqual(['Richie Hawtin']);
    expect(directorNames('Virgil Abloh and Benji B, Kim Jones')).toEqual(['Virgil Abloh', 'Benji B']);
    expect(directorNames(null)).toEqual([]);
  });

  it('asks Wikipedia for free lead photos and Commons for their credits', () => {
    expect(wikipediaPagesUrl(['Kim Jones', 'Pharrell Williams'])).toContain('titles=Kim+Jones%7CPharrell+Williams');
    expect(wikipediaPagesUrl(['A'])).toContain('pilicense=free');
    expect(commonsPhotosUrl(['A b.jpg'])).toContain('titles=File%3AA+b.jpg');
  });

  it('follows renames and keeps only articles about a person', () => {
    const pages = readWikipediaPages(pagesReply, names);
    expect([...pages.keys()]).toEqual(['nicolas ghesquière', 'Jun Takahashi']);
    expect(pages.get('nicolas ghesquière')).toEqual({ url: 'https://en.wikipedia.org/wiki/Nicolas_Ghesqui%C3%A8re', file: 'Nicholas_Ghesquiere_Paris_Fashion_Week_2019.jpg' });
    expect(readWikipediaPages(null, names).size).toBe(0);
  });

  it('credits Commons photos in plain text', () => {
    expect(readCommonsPhotos(photosReply).get('Nicholas_Ghesquiere_Paris_Fashion_Week_2019.jpg')).toEqual({
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Nicholas.jpg/400px-Nicholas.jpg',
      credit: 'Myles Kalus Anak Jihem', licence: 'CC BY-SA 4.0',
      source: 'https://commons.wikimedia.org/wiki/File:Nicholas_Ghesquiere_Paris_Fashion_Week_2019.jpg',
    });
  });

  it('prefers the curated directory, refuses a photo of the work, and names the rest with a search link', () => {
    const designers = portraitDesigners(['Raf Simons', ...names], readWikipediaPages(pagesReply, names), readCommonsPhotos(photosReply));
    expect(designers[0]).toBe(DESIGNERS.simons);
    expect(designers[1]).toMatchObject({ name: 'nicolas ghesquière', photo: { credit: 'Myles Kalus Anak Jihem' } });
    expect(designers[2]).toEqual({ name: 'Jun Takahashi', wikipedia: 'https://en.wikipedia.org/wiki/Jun_Takahashi', photo: null });
    expect(designers[3]).toEqual({ name: 'Kim Jones', wikipedia: 'https://en.wikipedia.org/wiki/Special:Search?search=Kim%20Jones', photo: null });
  });
});
