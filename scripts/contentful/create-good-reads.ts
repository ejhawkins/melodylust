// Adds a `goodRead` content type to the space, for the Reading Room's Good Reads list: a title, the publication it's
// from, a one-line note, the link, and an optional order (lowest number shows first). Run once:
//   npx tsx scripts/contentful/create-good-reads.ts
// Reads CONTENTFUL_SPACE_ID and CONTENTFUL_MANAGEMENT_TOKEN from .env; the token travels only in headers and is never
// printed. It only adds: if `goodRead` already exists it is left as it is, and no entry is created.
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
  { id: 'order', name: 'Order', type: 'Integer', required: false, localized: false },
];

const existing = await cma('GET', '/content_types/goodRead');
if (existing.status !== 404) {
  console.log('`goodRead` already exists; left as it is.');
} else {
  const created = await cma('PUT', '/content_types/goodRead', {
    name: 'Good read', description: 'A link for the Reading Room’s Good Reads list. Lowest Order shows first.', displayField: 'title', fields: FIELDS,
  });
  await cma('PUT', '/content_types/goodRead/published', undefined, { 'X-Contentful-Version': String((created.json['sys'] as Json)['version']) });
  console.log('Created and published content type `goodRead` (Good read).');
}
