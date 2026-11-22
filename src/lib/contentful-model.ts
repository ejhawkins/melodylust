// The Contentful content model MelodyLust reads, in one place: every content type the site or a seed script uses, with
// the fields each one needs. It mirrors the scripts in scripts/contentful/ (which create the types) and the readers in
// src/lib (which turn entries into the site's own shapes). scripts/contentful/export-model.ts fetches the space's live
// model and compares it with this one, so a renamed or missing field shows up before a page quietly goes empty.
// Nothing here holds a credential or makes a request.

export type ModelField = {
  id: string;
  /** Contentful's field type: Symbol (short text), Text (long text), RichText, Integer, Date, Link or Array. */
  type: 'Symbol' | 'Text' | 'RichText' | 'Integer' | 'Number' | 'Date' | 'Boolean' | 'Link' | 'Array' | 'Object';
  /** The site leaves an entry out (or the script refuses one) without it. */
  required?: boolean;
  /** For Link fields, and for Arrays of links: what they point at. */
  link?: 'Entry' | 'Asset';
  /** For entry links: the content types allowed. */
  to?: string[];
  note?: string;
};
export type ModelType = { id: string; name: string; feature: string; readBy: string; createdBy: string; fields: ModelField[] };

/** The edition genres, as stories and good reads spell them. */
export const MODEL_GENRES = ['Hip-Hop', 'Pop', 'R&B', 'Electronic', 'Rock', 'Indie', 'Jazz', 'Country'] as const;

export const CONTENT_MODEL: ModelType[] = [
  {
    id: 'story', name: 'Story', feature: 'Listening Room genre editions (journal stories)',
    readBy: 'src/lib/contentful.ts', createdBy: 'scripts/contentful/seed-stories.ts',
    fields: [
      { id: 'title', type: 'Symbol', required: true },
      { id: 'genre', type: 'Symbol', required: true, note: `One of ${MODEL_GENRES.join(', ')}` },
      { id: 'category', type: 'Symbol', note: 'Style, Music, Fashion or Runway; Music when empty' },
      { id: 'intro', type: 'Text', required: true, note: 'The first paragraph of the body stands in when empty' },
      { id: 'body', type: 'RichText', required: true, note: 'Long text also reads' },
      { id: 'image', type: 'Link', link: 'Asset', note: 'The first image in the body stands in when empty' },
      { id: 'date', type: 'Date', note: 'The first-published date stands in when empty' },
    ],
  },
  {
    id: 'goodRead', name: 'Good read', feature: 'Reading Room Good Reads, and each genre edition’s reads',
    readBy: 'src/lib/good-reads.ts', createdBy: 'scripts/contentful/create-good-reads.ts',
    fields: [
      { id: 'title', type: 'Symbol', required: true },
      { id: 'source', type: 'Symbol', note: 'The link’s site stands in when empty' },
      { id: 'note', type: 'Symbol' },
      { id: 'url', type: 'Symbol', required: true, note: 'http or https only' },
      { id: 'genre', type: 'Symbol', note: `One of ${MODEL_GENRES.join(', ')}` },
      { id: 'image', type: 'Link', link: 'Asset', note: 'Thumbnail' },
      { id: 'order', type: 'Integer', note: 'Lowest first' },
    ],
  },
  {
    id: 'genre', name: 'Genre', feature: 'Song looks: genres songs, artists and pieces are filed under',
    readBy: 'src/lib/contentful-looks.ts', createdBy: 'scripts/contentful/seed-song-looks.ts',
    fields: [
      { id: 'name', type: 'Symbol', required: true },
      { id: 'slug', type: 'Symbol', required: true },
      { id: 'parent', type: 'Link', link: 'Entry', to: ['genre'] },
    ],
  },
  {
    id: 'styleTag', name: 'Style tag', feature: 'Song looks: hashtags for era, scene, motif, material, colour, silhouette, mood',
    readBy: '(not read by the site yet)', createdBy: 'scripts/contentful/seed-song-looks.ts',
    fields: [
      { id: 'label', type: 'Symbol', required: true, note: 'A lowercase hashtag, like #nightdrive' },
      { id: 'kind', type: 'Symbol', required: true },
    ],
  },
  {
    id: 'artist', name: 'Artist', feature: 'Song looks: the artist fallback for a song’s pieces',
    readBy: 'src/lib/contentful-looks.ts', createdBy: 'scripts/contentful/seed-song-looks.ts',
    fields: [
      { id: 'name', type: 'Symbol', required: true },
      { id: 'hashtag', type: 'Symbol', required: true },
      { id: 'genres', type: 'Array', required: true, link: 'Entry', to: ['genre'] },
      { id: 'similarArtists', type: 'Array', link: 'Entry', to: ['artist'] },
      { id: 'styleTags', type: 'Array', link: 'Entry', to: ['styleTag'] },
    ],
  },
  {
    id: 'clothingItem', name: 'Clothing item', feature: 'Song looks: one piece on the product card',
    readBy: 'src/lib/contentful-looks.ts', createdBy: 'scripts/contentful/seed-song-looks.ts + extend-clothing-items.ts',
    fields: [
      { id: 'name', type: 'Symbol', required: true },
      { id: 'note', type: 'Symbol', required: true },
      { id: 'price', type: 'Symbol', required: true },
      { id: 'shopUrl', type: 'Symbol' },
      { id: 'category', type: 'Symbol', required: true },
      { id: 'genres', type: 'Array', link: 'Entry', to: ['genre'] },
      { id: 'artists', type: 'Array', link: 'Entry', to: ['artist'] },
      { id: 'styleTags', type: 'Array', link: 'Entry', to: ['styleTag'] },
      { id: 'image', type: 'Link', link: 'Asset', note: 'A piece with no image and no colourway photo is left off the card' },
      { id: 'kicker', type: 'Symbol' },
      { id: 'collection', type: 'Symbol' },
      { id: 'sizes', type: 'Array' },
      { id: 'colorways', type: 'Array', link: 'Entry', to: ['colorway'] },
    ],
  },
  {
    id: 'colorway', name: 'Colourway', feature: 'Song looks: one colour of a piece',
    readBy: 'src/lib/contentful-looks.ts', createdBy: 'scripts/contentful/extend-clothing-items.ts',
    fields: [
      { id: 'name', type: 'Symbol', required: true },
      { id: 'swatch', type: 'Symbol', required: true, note: 'Six-digit hex, like #5a3a22' },
      { id: 'image', type: 'Link', required: true, link: 'Asset' },
    ],
  },
  {
    id: 'song', name: 'Song', feature: 'Song looks: a Listening Room song, keyed by its caption',
    readBy: 'src/lib/contentful-looks.ts', createdBy: 'scripts/contentful/seed-song-looks.ts',
    fields: [
      { id: 'caption', type: 'Symbol', required: true, note: '"Title — Artist" with an em dash; must match the playlist exactly' },
      { id: 'title', type: 'Symbol', required: true },
      { id: 'artist', type: 'Link', required: true, link: 'Entry', to: ['artist'] },
      { id: 'genres', type: 'Array', required: true, link: 'Entry', to: ['genre'] },
      { id: 'styleTags', type: 'Array', link: 'Entry', to: ['styleTag'] },
      { id: 'spotifyUrl', type: 'Symbol' },
      { id: 'pieces', type: 'Array', link: 'Entry', to: ['clothingItem'], note: 'Up to 3, in order' },
      { id: 'moodboard', type: 'Array', link: 'Asset', note: 'Up to 3 images (not read by the site yet)' },
    ],
  },
  {
    id: 'runwayDesigner', name: 'Designer', feature: 'Runway Songs: a creative director',
    readBy: 'src/lib/runway-archive.ts', createdBy: 'scripts/contentful/runway-music-archive.cjs',
    fields: [
      { id: 'name', type: 'Symbol', required: true },
      { id: 'wikipedia', type: 'Symbol', required: true },
      { id: 'photo', type: 'Link', link: 'Asset' },
      { id: 'photoCredit', type: 'Symbol' },
      { id: 'photoLicence', type: 'Symbol' },
      { id: 'photoSource', type: 'Symbol' },
    ],
  },
  {
    id: 'runwayShow', name: 'Show', feature: 'Runway Songs: one runway show',
    readBy: 'src/lib/runway-archive.ts', createdBy: 'scripts/contentful/runway-music-archive.cjs',
    fields: [
      { id: 'name', type: 'Symbol', required: true },
      { id: 'house', type: 'Symbol', required: true },
      { id: 'season', type: 'Symbol', required: true },
      { id: 'year', type: 'Integer', required: true },
      { id: 'designers', type: 'Array', required: true, link: 'Entry', to: ['runwayDesigner'] },
      { id: 'looks', type: 'Array', note: 'Up to 5 Tagwalk links' },
    ],
  },
  {
    id: 'runwaySong', name: 'Song (runway)', feature: 'Runway Songs: a song a show played',
    readBy: 'src/lib/runway-archive.ts', createdBy: 'scripts/contentful/runway-music-archive.cjs',
    fields: [
      { id: 'title', type: 'Symbol', required: true },
      { id: 'version', type: 'Symbol' },
      { id: 'artist', type: 'Symbol', required: true },
      { id: 'category', type: 'Symbol', required: true, note: 'A, B, C or D' },
      { id: 'bpm', type: 'Integer' },
      { id: 'spotify', type: 'Symbol', required: true },
      { id: 'show', type: 'Link', required: true, link: 'Entry', to: ['runwayShow'] },
      { id: 'sources', type: 'Array' },
      { id: 'order', type: 'Integer' },
    ],
  },
];

type Bag = Record<string, unknown>;
const bag = (value: unknown): Bag | null => (value && typeof value === 'object' && !Array.isArray(value) ? value as Bag : null);
const str = (value: unknown) => (typeof value === 'string' ? value : '');

/** One content type as the space has it, cut down to what the comparison needs. */
export type LiveType = { id: string; name: string; fields: { id: string; type: string; required: boolean; link: string; disabled: boolean; omitted: boolean }[] };

/** A `GET /content_types` reply (Delivery or Management API) as plain types. Anything else reads as none. */
export function readLiveModel(payload: unknown): LiveType[] {
  const items = bag(payload)?.['items'];
  return (Array.isArray(items) ? items : []).flatMap(item => {
    const type = bag(item);
    const id = str(bag(type?.['sys'])?.['id']);
    if (!type || !id) return [];
    const fields = (Array.isArray(type['fields']) ? type['fields'] : []).flatMap(raw => {
      const f = bag(raw);
      if (!f || !str(f['id'])) return [];
      const items = bag(f['items']);
      return [{
        id: str(f['id']), type: str(f['type']), required: f['required'] === true,
        link: str(f['linkType']) || str(items?.['linkType']),
        disabled: f['disabled'] === true, omitted: f['omitted'] === true,
      }];
    });
    return [{ id, name: str(type['name']), fields }];
  });
}

export type Drift = { level: 'missing' | 'mismatch' | 'optional' | 'extra'; type: string; field?: string; detail: string };

/** What differs between the model the site expects and the space's live model. `missing` and `mismatch` break a
 *  reader (a page shows its bundled fallback or leaves entries out); `optional` is a field the site could use that the
 *  space lacks, and `extra` is only news: the space has more than the site reads. */
export function compareModel(live: LiveType[], expected: ModelType[] = CONTENT_MODEL): Drift[] {
  const drift: Drift[] = [];
  const byId = new Map(live.map(type => [type.id, type]));
  for (const want of expected) {
    const have = byId.get(want.id);
    if (!have) { drift.push({ level: 'missing', type: want.id, detail: `No \`${want.id}\` content type. Create it with ${want.createdBy}.` }); continue; }
    for (const field of want.fields) {
      const got = have.fields.find(f => f.id === field.id);
      if (!got) { drift.push({ level: field.required ? 'missing' : 'optional', type: want.id, field: field.id, detail: field.required ? `Required field \`${field.id}\` is missing.` : `Optional field \`${field.id}\` isn’t in the space yet.` }); continue; }
      if (got.omitted || got.disabled) drift.push({ level: 'mismatch', type: want.id, field: field.id, detail: `\`${field.id}\` is ${got.omitted ? 'hidden from the API' : 'disabled'}, so the site can’t read it.` });
      // A body may be Long text in place of Rich text: the story reader takes either.
      const bodyOk = want.id === 'story' && field.id === 'body' && got.type === 'Text';
      if (got.type !== field.type && !bodyOk) drift.push({ level: 'mismatch', type: want.id, field: field.id, detail: `\`${field.id}\` is ${got.type}; the site reads ${field.type}.` });
      else if (field.link && got.link && got.link !== field.link) drift.push({ level: 'mismatch', type: want.id, field: field.id, detail: `\`${field.id}\` links to ${got.link}; the site expects ${field.link}.` });
    }
    for (const got of have.fields) if (!want.fields.some(f => f.id === got.id)) drift.push({ level: 'extra', type: want.id, field: got.id, detail: `\`${got.id}\` is in the space but the site doesn’t read it.` });
  }
  for (const type of live) if (!expected.some(want => want.id === type.id)) drift.push({ level: 'extra', type: type.id, detail: `\`${type.id}\` (${type.name}) is in the space but the site doesn’t read it.` });
  return drift;
}

/** The live model as Markdown, one table per type, with the drift report on top. */
export function modelMarkdown(live: LiveType[], drift: Drift[], when: string): string {
  const lines = [`# MelodyLust content model (live)`, '', `Fetched ${when} by \`scripts/contentful/export-model.ts\`. ${live.length} content types.`, ''];
  const problems = drift.filter(d => d.level === 'missing' || d.level === 'mismatch');
  lines.push('## Check against the site', '', problems.length ? problems.map(d => `- **${d.type}${d.field ? `.${d.field}` : ''}**: ${d.detail}`).join('\n') : 'Every type and field the site reads is in the space.', '');
  const news = drift.filter(d => d.level === 'optional' || d.level === 'extra');
  if (news.length) lines.push('Also noted:', '', news.map(d => `- ${d.type}${d.field ? `.${d.field}` : ''}: ${d.detail}`).join('\n'), '');
  for (const type of live) {
    lines.push(`## ${type.name} (\`${type.id}\`)`, '', '| Field | Type | Required |', '| --- | --- | --- |');
    for (const f of type.fields) lines.push(`| ${f.id} | ${f.type}${f.link ? ` → ${f.link}` : ''} | ${f.required ? 'yes' : ''} |`);
    lines.push('');
  }
  return lines.join('\n');
}
