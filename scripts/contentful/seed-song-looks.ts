// Seeds the Contentful model behind the Listening Room's "song look" pop-up: genre, styleTag, artist, clothingItem and
// song content types, then one song per Autumn Mix track with a Spotify link (from iconicSongs in src/data/home.ts), its
// artist, its genres and its three pieces (from songLooks) linked in order. Run once against the space:
//   npx tsx scripts/contentful/seed-song-looks.ts
// Reads CONTENTFUL_SPACE_ID and CONTENTFUL_MANAGEMENT_TOKEN (a personal CMA token) from .env; the token travels only in
// headers and is never printed. Stops without changing anything if any of the five types already exists. Re-running
// skips entries that already exist (matched on their unique field, or on name for pieces).
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
for (const line of existsSync(resolve(root, '.env')) ? readFileSync(resolve(root, '.env'), 'utf8').split('\n') : []) {
  const match = /^([A-Z_]+)=(.*)$/.exec(line);
  if (match && !process.env[match[1]!]) process.env[match[1]!] = match[2]!.trim();
}
const SPACE = process.env['CONTENTFUL_SPACE_ID'];
const TOKEN = process.env['CONTENTFUL_MANAGEMENT_TOKEN'];
const ENV = process.env['CONTENTFUL_ENVIRONMENT'] || 'master';
if (!SPACE || !TOKEN) { console.error('Set CONTENTFUL_SPACE_ID and CONTENTFUL_MANAGEMENT_TOKEN in .env'); process.exit(1); }

const BASE = `https://api.contentful.com/spaces/${encodeURIComponent(SPACE)}/environments/${encodeURIComponent(ENV)}`;
const L = 'en-US';

type Json = Record<string, unknown>;
async function cma(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Json> {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/vnd.contentful.management.v1+json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const json = (text ? JSON.parse(text) : {}) as Json;
  if (!response.ok) throw new Error(`${method} ${path} → ${response.status} ${(json['sys'] as Json | undefined)?.['id'] ?? ''} ${json['message'] ?? ''} ${JSON.stringify(json['details'] ?? '')}`);
  return json;
}
const version = (entity: Json) => String((entity['sys'] as Json)['version']);
const sysId = (entity: Json) => String((entity['sys'] as Json)['id']);
const entryLink = (id: string) => ({ sys: { type: 'Link', linkType: 'Entry', id } });
const HASHTAG = { regexp: { pattern: '^#[a-z0-9]+$' }, message: 'A lowercase hashtag, like #nightdrive.' };

// ——— 1. Content types, in dependency order ———
type Field = Json;
const TYPES: { id: string; name: string; description: string; displayField: string; fields: Field[] }[] = [
  { id: 'genre', name: 'Genre', description: 'A music genre; subgenres point at their parent (Ska Punk → Rock and Roll).', displayField: 'name', fields: [
    { id: 'name', name: 'Name', type: 'Symbol', required: true, validations: [{ unique: true }] },
    { id: 'slug', name: 'Slug', type: 'Symbol', required: true, validations: [{ unique: true }, { regexp: { pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' }, message: 'Lowercase words joined by hyphens, like hip-hop.' }] },
    { id: 'parent', name: 'Parent genre', type: 'Link', linkType: 'Entry', required: false, validations: [{ linkContentType: ['genre'] }] },
  ] },
  { id: 'styleTag', name: 'Style tag', description: 'A hashtag that narrows looks: an era, scene, motif, material, colour, silhouette or mood.', displayField: 'label', fields: [
    { id: 'label', name: 'Label', type: 'Symbol', required: true, validations: [{ unique: true }, HASHTAG] },
    { id: 'kind', name: 'Kind', type: 'Symbol', required: true, validations: [{ in: ['era', 'scene', 'motif', 'material', 'color', 'silhouette', 'mood'] }] },
  ] },
  { id: 'artist', name: 'Artist', description: 'A musician or group, with their genres, similar artists and style tags.', displayField: 'name', fields: [
    { id: 'name', name: 'Name', type: 'Symbol', required: true, validations: [{ unique: true }] },
    { id: 'hashtag', name: 'Hashtag', type: 'Symbol', required: true, validations: [{ unique: true }, HASHTAG] },
    { id: 'genres', name: 'Genres', type: 'Array', required: true, validations: [{ size: { min: 1 } }], items: { type: 'Link', linkType: 'Entry', validations: [{ linkContentType: ['genre'] }] } },
    { id: 'similarArtists', name: 'Similar artists', type: 'Array', required: false, items: { type: 'Link', linkType: 'Entry', validations: [{ linkContentType: ['artist'] }] } },
    { id: 'styleTags', name: 'Style tags', type: 'Array', required: false, items: { type: 'Link', linkType: 'Entry', validations: [{ linkContentType: ['styleTag'] }] } },
  ] },
  { id: 'clothingItem', name: 'Clothing item', description: 'One piece in a song look: name, note and price as displayed, with the genres, artists and tags it suits.', displayField: 'name', fields: [
    { id: 'name', name: 'Name', type: 'Symbol', required: true },
    { id: 'note', name: 'Note', type: 'Symbol', required: true },
    { id: 'price', name: 'Price', type: 'Symbol', required: true },
    { id: 'shopUrl', name: 'Shop link', type: 'Symbol', required: false, validations: [{ regexp: { pattern: '^https://' }, message: 'A full https:// link.' }] },
    { id: 'category', name: 'Category', type: 'Symbol', required: true, validations: [{ in: ['outerwear', 'tops', 'bottoms', 'dresses', 'shoes', 'accessories'] }] },
    { id: 'genres', name: 'Genres', type: 'Array', required: false, items: { type: 'Link', linkType: 'Entry', validations: [{ linkContentType: ['genre'] }] } },
    { id: 'artists', name: 'Artists', type: 'Array', required: false, items: { type: 'Link', linkType: 'Entry', validations: [{ linkContentType: ['artist'] }] } },
    { id: 'styleTags', name: 'Style tags', type: 'Array', required: false, items: { type: 'Link', linkType: 'Entry', validations: [{ linkContentType: ['styleTag'] }] } },
    { id: 'image', name: 'Image', type: 'Link', linkType: 'Asset', required: false, validations: [{ linkMimetypeGroup: ['image'] }] },
  ] },
  { id: 'song', name: 'Song', description: 'A song in the Listening Room. The caption is the app’s key: "<Title> — <Artist>" with an em dash.', displayField: 'caption', fields: [
    { id: 'caption', name: 'Caption', type: 'Symbol', required: true, validations: [{ unique: true }, { regexp: { pattern: '^.+ — .+$' }, message: 'Title, an em dash with spaces, then the artist: Day \'N\' Nite — Kid Cudi' }] },
    { id: 'title', name: 'Title', type: 'Symbol', required: true },
    { id: 'artist', name: 'Artist', type: 'Link', linkType: 'Entry', required: true, validations: [{ linkContentType: ['artist'] }] },
    { id: 'genres', name: 'Genres', type: 'Array', required: true, validations: [{ size: { min: 1 } }], items: { type: 'Link', linkType: 'Entry', validations: [{ linkContentType: ['genre'] }] } },
    { id: 'styleTags', name: 'Style tags', type: 'Array', required: false, items: { type: 'Link', linkType: 'Entry', validations: [{ linkContentType: ['styleTag'] }] } },
    { id: 'spotifyUrl', name: 'Spotify link', type: 'Symbol', required: false, validations: [{ regexp: { pattern: '^https://open\\.spotify\\.com/track/' }, message: 'A Spotify track link.' }] },
    { id: 'pieces', name: 'Pieces', type: 'Array', required: false, validations: [{ size: { max: 3 } }], items: { type: 'Link', linkType: 'Entry', validations: [{ linkContentType: ['clothingItem'] }] } },
    { id: 'moodboard', name: 'Moodboard', type: 'Array', required: false, validations: [{ size: { max: 3 } }], items: { type: 'Link', linkType: 'Asset', validations: [{ linkMimetypeGroup: ['image'] }] } },
  ] },
];

async function ensureTypes() {
  for (const type of TYPES) {
    const existing = await fetch(`${BASE}/content_types/${type.id}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (existing.ok) {
      const found = await existing.json() as { fields: { id: string; type: string; required?: boolean }[] };
      console.error(`A \`${type.id}\` content type already exists; nothing was changed. Its fields:`);
      for (const f of found.fields) console.error(`  - ${f.id} (${f.type}${f.required ? ', required' : ''})`);
      process.exit(2);
    }
    if (existing.status !== 404) throw new Error(`Checking for ${type.id} → ${existing.status}`);
  }
  for (const type of TYPES) {
    const created = await cma('PUT', `/content_types/${type.id}`, { name: type.name, description: type.description, displayField: type.displayField, fields: type.fields.map(f => ({ localized: false, ...f })) });
    await cma('PUT', `/content_types/${type.id}/published`, undefined, { 'X-Contentful-Version': version(created) });
    console.log(`Created and published content type \`${type.id}\`.`);
  }
}

// ——— 2. The data, read from home.ts without running component code ———
type Song = { caption: string; title: string; artist: string; link: string; genres: string[] };
type Look = { name: string; note: string; price: string };

function loadData(): { songs: Song[]; looks: Map<string, Look[]> } {
  const source = readFileSync(resolve(root, 'src/data/home.ts'), 'utf8');
  const songs: Song[] = [];
  const songBlock = source.slice(source.indexOf('export const iconicSongs = ['), source.indexOf('];', source.indexOf('export const iconicSongs = [')));
  for (const m of songBlock.matchAll(/caption: "([^"]+)", link: "([^"]+)", genres: \[([^\]]+)\]/g)) {
    const caption = m[1]!;
    const dash = caption.indexOf(' — ');
    if (dash < 0) continue;
    songs.push({ caption, title: caption.slice(0, dash), artist: caption.slice(dash + 3), link: m[2]!, genres: [...m[3]!.matchAll(/"([^"]+)"/g)].map(g => g[1]!) });
  }
  const looks = new Map<string, Look[]>();
  const lookBlock = source.slice(source.indexOf('export const songLooks'), source.indexOf('};', source.indexOf('export const songLooks')));
  for (const m of lookBlock.matchAll(/"([^"]+)": \[([\s\S]*?)\n {2}\]/g)) {
    looks.set(m[1]!, [...m[2]!.matchAll(/\{ name: "([^"]+)", note: "([^"]+)", price: "([^"]+)" \}/g)].map(p => ({ name: p[1]!, note: p[2]!, price: p[3]! })));
  }
  return { songs, looks };
}

const slug = (name: string) => name === 'R&B' ? 'rnb' : name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const hashtag = (name: string) => `#${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;

// A piece's category, read from its name; home.ts carries none.
const CATEGORY: [RegExp, string][] = [
  [/jacket|bomber|parka|blazer|cardigan/i, 'outerwear'],
  [/dress|gown/i, 'dresses'],
  [/sneaker|heel|boot/i, 'shoes'],
  [/pants|trouser|skirt|short/i, 'bottoms'],
  [/hoop|choker|chain|glove|earring|cuff|aviator|sunglass|hat|bag/i, 'accessories'],
  [/hoodie|shirt|tunic|track set|tee|top/i, 'tops'],
];
const categoryOf = (name: string) => CATEGORY.find(([re]) => re.test(name))?.[1] ?? 'tops';

// ——— 3. Entries ———
async function findOne(type: string, field: string, value: string): Promise<Json | null> {
  const found = await cma('GET', `/entries?content_type=${type}&fields.${field}=${encodeURIComponent(value)}&limit=1`);
  return ((found['items'] as Json[])[0]) ?? null;
}
async function publishEntry(type: string, fields: Json): Promise<string> {
  const entry = await cma('POST', '/entries', { fields }, { 'X-Contentful-Content-Type': type });
  await cma('PUT', `/entries/${sysId(entry)}/published`, undefined, { 'X-Contentful-Version': version(entry) });
  return sysId(entry);
}
const field = (value: unknown) => ({ [L]: value });

async function seed() {
  const { songs, looks } = loadData();
  if (!songs.length) throw new Error('No songs with Spotify links found in src/data/home.ts');
  const made = { genre: 0, artist: 0, clothingItem: 0, song: 0 };

  const genreIds = new Map<string, string>();
  for (const name of [...new Set(songs.flatMap(s => s.genres))]) {
    const existing = await findOne('genre', 'name', name);
    if (existing) { genreIds.set(name, sysId(existing)); continue; }
    genreIds.set(name, await publishEntry('genre', { name: field(name), slug: field(slug(name)) }));
    made.genre++;
  }

  const artistIds = new Map<string, string>();
  for (const name of [...new Set(songs.map(s => s.artist))]) {
    const existing = await findOne('artist', 'name', name);
    if (existing) { artistIds.set(name, sysId(existing)); continue; }
    // The artist's genres: every genre their songs here are filed under.
    const genres = [...new Set(songs.filter(s => s.artist === name).flatMap(s => s.genres))].map(g => entryLink(genreIds.get(g)!));
    artistIds.set(name, await publishEntry('artist', { name: field(name), hashtag: field(hashtag(name)), genres: field(genres) }));
    made.artist++;
  }

  for (const song of songs) {
    if (await findOne('song', 'caption', song.caption)) { console.log(`Skipping (already there): ${song.caption}`); continue; }
    const pieces = looks.get(song.caption) ?? [];
    if (pieces.length !== 3) throw new Error(`${song.caption} has ${pieces.length} pieces in songLooks; expected 3`);
    const pieceIds: string[] = [];
    for (const piece of pieces) {
      pieceIds.push(await publishEntry('clothingItem', {
        name: field(piece.name), note: field(piece.note), price: field(piece.price), category: field(categoryOf(piece.name)),
        genres: field(song.genres.map(g => entryLink(genreIds.get(g)!))),
        artists: field([entryLink(artistIds.get(song.artist)!)]),
      }));
      made.clothingItem++;
    }
    await publishEntry('song', {
      caption: field(song.caption), title: field(song.title), artist: field(entryLink(artistIds.get(song.artist)!)),
      genres: field(song.genres.map(g => entryLink(genreIds.get(g)!))), spotifyUrl: field(song.link),
      pieces: field(pieceIds.map(entryLink)),
    });
    made.song++;
    console.log(`Published: ${song.caption} with ${pieces.map(p => p.name).join(', ')}`);
  }
  console.log('Entries created:', made);
}

await ensureTypes();
await seed();
console.log('Done.');
