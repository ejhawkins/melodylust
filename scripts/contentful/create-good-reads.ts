// Adds a `goodRead` content type to the space, for the Reading Room's Good Reads list: a title, the publication it's
// from, a one-line note, the link, its genre (for the Listening Room's edition), a thumbnail and an optional order (lowest number shows first). Run once, and again
// after a field is added here:
//   npx tsx scripts/contentful/create-good-reads.ts
// Reads CONTENTFUL_SPACE_ID and CONTENTFUL_MANAGEMENT_TOKEN from .env; the token travels only in headers and is never
// printed. It only adds: an existing `goodRead` gains the fields it lacks and keeps the rest, and no entry is created.
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

const FIELDS = [
  { id: 'title', name: 'Title', type: 'Symbol', required: true, localized: false, validations: [{ size: { max: 200 } }] },
  { id: 'source', name: 'Source', type: 'Symbol', required: false, localized: false, validations: [{ size: { max: 60 } }] },
  { id: 'note', name: 'Note', type: 'Symbol', required: false, localized: false, validations: [{ size: { max: 200 } }] },
  { id: 'url', name: 'Link', type: 'Symbol', required: true, localized: false, validations: [{ regexp: { pattern: '^https?://\\S+$' }, message: 'A full web address, starting with https://' }] },
  { id: 'genre', name: 'Genre', type: 'Symbol', required: false, localized: false, validations: [{ in: ['Hip-Hop', 'Pop', 'R&B', 'Electronic', 'Rock', 'Indie', 'Jazz', 'Country'] }] },
  { id: 'image', name: 'Thumbnail', type: 'Link', linkType: 'Asset', required: false, localized: false, validations: [{ linkMimetypeGroup: ['image'] }] },
  { id: 'order', name: 'Order', type: 'Integer', required: false, localized: false },
];
const publish = (entity: Json) => cma('PUT', '/content_types/goodRead/published', undefined, { 'X-Contentful-Version': String((entity['sys'] as Json)['version']) });

const existing = await cma('GET', '/content_types/goodRead');
if (existing.status !== 404) {
  const fields = existing.json['fields'] as ({ id: string } & Json)[];
  const missing = FIELDS.filter(field => !fields.some(f => f.id === field.id));
  if (!missing.length) console.log('`goodRead` already has every field; left as it is.');
  else {
    const updated = await cma('PUT', '/content_types/goodRead', { ...existing.json, fields: [...fields, ...missing] }, { 'X-Contentful-Version': String((existing.json['sys'] as Json)['version']) });
    await publish(updated.json);
    console.log(`Added ${missing.map(f => f.id).join(', ')} to \`goodRead\` and published it.`);
  }
} else {
  const created = await cma('PUT', '/content_types/goodRead', {
    name: 'Good read', description: 'A link for the Reading Room’s Good Reads list. Lowest Order shows first.', displayField: 'title', fields: FIELDS,
  });
  await publish(created.json);
  console.log('Created and published content type `goodRead` (Good read).');
}
