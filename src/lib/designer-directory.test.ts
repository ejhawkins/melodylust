import { describe, expect, it } from 'vitest';
import { parseVogueDesignerDirectory } from './designer-directory.server';

describe('parseVogueDesignerDirectory', () => {
  it('returns unique Vogue designer records with stable source URLs', () => {
    const html = `
      <a href="/fashion-shows/designer/prada">Prada</a>
      <a href="https://www.vogue.com/fashion-shows/designer/loewe"> Loewe </a>
      <a href="/fashion-shows/designer/prada">PRADA</a>
      <a href="/fashion-shows/designers">Designers</a>
      <a href="/fashion-shows/designer/">Missing slug</a>
    `;

    expect(parseVogueDesignerDirectory(html)).toEqual([
      {
        name: 'Loewe',
        normalizedName: 'loewe',
        source: 'vogue-runway',
        sourceId: 'loewe',
        sourceUrl: 'https://www.vogue.com/fashion-shows/designer/loewe',
      },
      {
        name: 'Prada',
        normalizedName: 'prada',
        source: 'vogue-runway',
        sourceId: 'prada',
        sourceUrl: 'https://www.vogue.com/fashion-shows/designer/prada',
      },
    ]);
  });
});
