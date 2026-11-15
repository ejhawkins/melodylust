// Extends the song-look model so a clothing item can fill the Listening Room's product card: a `colorway` content type
// (a colour's name, hex swatch and photo) and four optional fields on `clothingItem` (kicker, collection, sizes,
// colorways). Run once, after seed-song-looks.ts:
//   npx tsx scripts/contentful/extend-clothing-items.ts
// Reads CONTENTFUL_SPACE_ID and CONTENTFUL_MANAGEMENT_TOKEN from .env; the token travels only in headers and is never
// printed. It only adds: no field, entry or content type is removed or changed, and re-running it adds nothing twice.
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
if (!SPACE || !TOKEN) { console.error('Set CONTENTFUL_SPACE_ID and CONTENTFUL_MANAGEMENT_TOKEN in .env'); process.exit(1); }

const BASE = `https://api.contentful.com/spaces/${encodeURIComponent(SPACE)}/environments/${encodeURIComponent(ENV)}`;
type Json = Record<string, unknown>;
type Field = { id: string } & Json;

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
const version = (entity: Json) => String((entity['sys'] as Json)['version']);
const publish = async (id: string, entity: Json) => { await cma('PUT', `/content_types/${id}/published`, undefined, { 'X-Contentful-Version': version(entity) }); };

const COLORWAY: Field[] = [
  { id: 'name', name: 'Name', type: 'Symbol', required: true, localized: false },
  { id: 'swatch', name: 'Swatch', type: 'Symbol', required: true, localized: false, validations: [{ regexp: { pattern: '^#[0-9a-fA-F]{6}$' }, message: 'A six-digit hex colour, like #5a3a22.' }] },
  { id: 'image', name: 'Photo', type: 'Link', linkType: 'Asset', required: true, localized: false, validations: [{ linkMimetypeGroup: ['image'] }] },
];
const CLOTHING_ADDITIONS: Field[] = [
  { id: 'kicker', name: 'Kicker', type: 'Symbol', required: false, localized: false },
  { id: 'collection', name: 'Collection', type: 'Symbol', required: false, localized: false },
  { id: 'sizes', name: 'Sizes', type: 'Array', required: false, localized: false, validations: [{ size: { max: 6 } }], items: { type: 'Symbol', validations: [{ size: { max: 4 } }] } },
  { id: 'colorways', name: 'Colourways', type: 'Array', required: false, localized: false, validations: [{ size: { max: 6 } }], items: { type: 'Link', linkType: 'Entry', validations: [{ linkContentType: ['colorway'] }] } },
];

const clothing = await cma('GET', '/content_types/clothingItem');
if (clothing.status === 404) { console.error('There is no `clothingItem` content type yet. Run seed-song-looks.ts first.'); process.exit(2); }

const colorway = await cma('GET', '/content_types/colorway');
if (colorway.status === 404) {
  const created = await cma('PUT', '/content_types/colorway', { name: 'Colourway', description: 'One colour of a clothing item: its name, a hex swatch and its photo.', displayField: 'name', fields: COLORWAY });
  await publish('colorway', created.json);
  console.log('Created and published content type `colorway`.');
} else console.log('`colorway` already exists; left as it is.');

const fields = clothing.json['fields'] as Field[];
const missing = CLOTHING_ADDITIONS.filter(addition => !fields.some(field => field.id === addition.id));
if (missing.length === 0) console.log('`clothingItem` already has kicker, collection, sizes and colorways; nothing to add.');
else {
  const updated = await cma('PUT', '/content_types/clothingItem', { name: clothing.json['name'], description: clothing.json['description'], displayField: clothing.json['displayField'], fields: [...fields, ...missing] }, { 'X-Contentful-Version': version(clothing.json) });
  await publish('clothingItem', updated.json);
  console.log(`Added to \`clothingItem\`: ${missing.map(field => field.id).join(', ')}.`);
}
