import { parseHTML } from 'linkedom';

const VOGUE_ORIGIN = 'https://www.vogue.com';
const DESIGNER_PATH = /^\/fashion-shows\/designer\/([a-z0-9][a-z0-9-]*)\/?$/;

export type DesignerDirectoryRecord = {
  name: string;
  normalizedName: string;
  source: 'vogue-runway';
  sourceId: string;
  sourceUrl: string;
};

export function normalizeDesignerName(name: string) {
  return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function parseVogueDesignerDirectory(html: string): DesignerDirectoryRecord[] {
  const { document } = parseHTML(html);
  const records = new Map<string, DesignerDirectoryRecord>();

  for (const anchor of document.querySelectorAll('a[href]')) {
    const url = new URL(anchor.getAttribute('href') ?? '', VOGUE_ORIGIN);
    if (url.origin !== VOGUE_ORIGIN) continue;
    const match = DESIGNER_PATH.exec(url.pathname);
    const name = anchor.textContent?.replace(/\s+/g, ' ').trim();
    const sourceId = match?.[1];
    if (!name || !sourceId || records.has(sourceId)) continue;
    records.set(sourceId, {
      name,
      normalizedName: normalizeDesignerName(name),
      source: 'vogue-runway',
      sourceId,
      sourceUrl: `${VOGUE_ORIGIN}/fashion-shows/designer/${sourceId}`,
    });
  }

  return [...records.values()].sort((left, right) => left.name.localeCompare(right.name, 'en'));
}