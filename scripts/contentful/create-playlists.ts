// Adds two content types to the space: `musicalReference`, one piece of music cited as a reference (a song, an album, a
// score, a sample, a live recording), and `playlist`, an editorial playlist built from those references. A playlist can
// also hold a Listening Room `song` or a Runway Songs `runwaySong` that's already in the space. Run once, and again
// after a field is added here:
//   npx tsx --env-file-if-exists=.env.local scripts/contentful/create-playlists.ts
// Reads CONTENTFUL_SPACE_ID and CONTENTFUL_MANAGEMENT_TOKEN; the token travels only in headers and is never printed.
// It only adds: an existing type gains the fields it lacks and keeps the rest, and no entry is created.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
for (const line of existsSync(resolve(root, '.env')) ? readFileSync(resolve(root, '.env'), 'utf8').split('\n') : []) {
  const match = /^([A-Z_]+)=(.*)$/.exec(line);
  if (match && !process.env[match[1]!]) process.env[match[1]!] = match[2]!.trim();
}
const SPACE = process.env['CONTENTFUL_SPACE_ID'];
const TOKEN = process.env['CONTENTFUL_MANAGEMENT_TOKEN'];
const ENV = process.env['CONTENTFUL_ENVIRONMENT'] || 'master';
if (!SPACE || !TOKEN) { console.error('Set CONTENTFUL_SPACE_ID and CONTENTFUL_MANAGEMENT_TOKEN in .env.local'); process.exit(1); }

const BASE = `https://api.contentful.com/spaces/${encodeURIComponent(SPACE)}/environments/${encodeURIComponent(ENV)}`;
type Json = Record<string, unknown>;

async function cma(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<{ status: number; json: Json }> {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/vnd.contentful.management.v1+json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  const json = (text ? JSON.parse(text) : {}) as Json;
  if (!response.ok && !(method === 'GET' && response.status === 404)) throw new Error(`${method} ${path} → ${response.status} ${json['message'] ?? ''} ${JSON.stringify(json['details'] ?? '')}`);
  return { status: response.status, json };
}

const GENRES = ['Hip-Hop', 'Pop', 'R&B', 'Electronic', 'Rock', 'Indie', 'Jazz', 'Country'];
const KINDS = ['Song', 'Album', 'Artist', 'Score', 'Sample', 'Live recording', 'Mix'];
const WEB = { regexp: { pattern: '^https?://\\S+$' }, message: 'A full web address, starting with https://' };

const REFERENCE_FIELDS = [
  { id: 'title', name: 'Title', type: 'Symbol', required: true, localized: false, validations: [{ size: { max: 200 } }] },
  { id: 'artist', name: 'Artist', type: 'Symbol', required: true, localized: false, validations: [{ size: { max: 200 } }] },
  { id: 'kind', name: 'Kind', type: 'Symbol', required: false, localized: false, validations: [{ in: KINDS }] },
  { id: 'year', name: 'Year', type: 'Integer', required: false, localized: false, validations: [{ range: { min: 1000, max: 2100 } }] },
  { id: 'note', name: 'Why it’s here', type: 'Symbol', required: false, localized: false, validations: [{ size: { max: 255 } }] },
  { id: 'spotifyUrl', name: 'Spotify link', type: 'Symbol', required: false, localized: false,
    validations: [{ regexp: { pattern: '^https://open\\.spotify\\.com/\\S+$' }, message: 'An open.spotify.com link' }] },
  { id: 'link', name: 'Other link', type: 'Symbol', required: false, localized: false, validations: [WEB] },
];

const PLAYLIST_FIELDS = [
  { id: 'title', name: 'Title', type: 'Symbol', required: true, localized: false, validations: [{ size: { max: 120 } }] },
  { id: 'slug', name: 'Slug', type: 'Symbol', required: true, localized: false,
    validations: [{ unique: true }, { regexp: { pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' }, message: 'Lowercase words joined by hyphens, like after-hours' }] },
  { id: 'description', name: 'Description', type: 'Text', required: false, localized: false, validations: [{ size: { max: 600 } }] },
  { id: 'cover', name: 'Cover', type: 'Link', linkType: 'Asset', required: false, localized: false, validations: [{ linkMimetypeGroup: ['image'] }] },
  { id: 'genre', name: 'Genre', type: 'Symbol', required: false, localized: false, validations: [{ in: GENRES }] },
  { id: 'references', name: 'Musical references', type: 'Array', required: true, localized: false,
    validations: [{ size: { min: 1, max: 100 } }],
    items: { type: 'Link', linkType: 'Entry', validations: [{ linkContentType: ['musicalReference', 'song', 'runwaySong'] }] } },
  { id: 'order', name: 'Order', type: 'Integer', required: false, localized: false },
];

async function ensure(id: string, name: string, description: string, fields: Json[]) {
  const publish = (entity: Json) => cma('PUT', `/content_types/${id}/published`, undefined, { 'X-Contentful-Version': String((entity['sys'] as Json)['version']) });
  const existing = await cma('GET', `/content_types/${id}`);
  if (existing.status === 404) {
    const created = await cma('PUT', `/content_types/${id}`, { name, description, displayField: 'title', fields });
    await publish(created.json);
    console.log(`Created and published content type \`${id}\` (${name}).`);
    return;
  }
  const have = existing.json['fields'] as ({ id: string } & Json)[];
  const missing = fields.filter(field => !have.some(f => f.id === field['id']));
  if (!missing.length) { console.log(`\`${id}\` already has every field; left as it is.`); return; }
  const updated = await cma('PUT', `/content_types/${id}`, { ...existing.json, fields: [...have, ...missing] }, { 'X-Contentful-Version': String((existing.json['sys'] as Json)['version']) });
  await publish(updated.json);
  console.log(`Added ${missing.map(f => f['id']).join(', ')} to \`${id}\` and published it.`);
}

// The reference type first: the playlist's references field only accepts types that exist.
await ensure('musicalReference', 'Musical reference', 'One piece of music cited as a reference: a song, album, score, sample or live recording.', REFERENCE_FIELDS);
await ensure('playlist', 'Playlist', 'An editorial playlist of musical references, in order. Lowest Order shows first among playlists.', PLAYLIST_FIELDS);
