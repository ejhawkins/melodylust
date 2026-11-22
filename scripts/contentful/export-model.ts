// Gets MelodyLust's content model from Contentful and checks it against the model the site reads
// (src/lib/contentful-model.ts). Read-only: it only GETs the content types, and changes nothing in the space.
//   npm run contentful:model
// Writes docs/contentful/content-model.live.json (the raw reply) and docs/contentful/content-model.live.md (tables plus
// the check), and exits 1 when a type or required field the site reads is missing or has the wrong type.
// Settings come from .env.local, then .env (the npm script loads both). Uses CONTENTFUL_SPACE_ID with a delivery token (CONTENTFUL_API_KEY or CONTENTFUL_DELIVERY_TOKEN), or a
// CONTENTFUL_MANAGEMENT_TOKEN when no delivery token is set. Tokens travel only in headers and are never printed.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compareModel, modelMarkdown, readLiveModel } from '../../src/lib/contentful-model';

const root = resolve(import.meta.dirname, '../..');
const SPACE = process.env['CONTENTFUL_SPACE_ID'];
const ENV = process.env['CONTENTFUL_ENVIRONMENT'] || 'master';
const delivery = process.env['CONTENTFUL_API_KEY'] || process.env['CONTENTFUL_DELIVERY_TOKEN'];
const management = process.env['CONTENTFUL_MANAGEMENT_TOKEN'];
const TOKEN = delivery || management;
if (!SPACE || !TOKEN) {
  console.error('Set CONTENTFUL_SPACE_ID and a token (CONTENTFUL_API_KEY, or CONTENTFUL_MANAGEMENT_TOKEN) in .env.local');
  process.exit(1);
}
const host = delivery ? (process.env['CONTENTFUL_API_URL'] || 'https://cdn.contentful.com') : 'https://api.contentful.com';
const url = `${host.replace(/\/$/, '')}/spaces/${encodeURIComponent(SPACE)}/environments/${encodeURIComponent(ENV)}/content_types?limit=1000`;

const response = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` }, signal: AbortSignal.timeout(15_000) });
const text = await response.text();
if (!response.ok) {
  let message = '';
  try { message = String((JSON.parse(text) as { message?: unknown }).message ?? ''); } catch { /* not JSON */ }
  console.error(`Contentful answered ${response.status} ${message}`.trim());
  process.exit(1);
}
const payload = JSON.parse(text) as unknown;
const live = readLiveModel(payload);
const drift = compareModel(live);
const out = resolve(root, 'docs/contentful');
mkdirSync(out, { recursive: true });
writeFileSync(resolve(out, 'content-model.live.json'), `${JSON.stringify(payload, null, 2)}\n`);
writeFileSync(resolve(out, 'content-model.live.md'), modelMarkdown(live, drift, new Date().toISOString().slice(0, 10)));

console.log(`${live.length} content types in ${ENV} (via the ${delivery ? 'Delivery' : 'Management'} API):`);
for (const type of live) console.log(`  ${type.id.padEnd(16)} ${type.fields.length} fields`);
const broken = drift.filter(d => d.level === 'missing' || d.level === 'mismatch');
for (const d of drift) console.log(`${d.level === 'missing' || d.level === 'mismatch' ? '✗' : '·'} ${d.type}${d.field ? `.${d.field}` : ''}: ${d.detail}`);
console.log(broken.length ? `${broken.length} problem(s) the site will hit. See docs/contentful/content-model.live.md.` : 'The site’s model is all there. Wrote docs/contentful/content-model.live.md.');
process.exit(broken.length ? 1 : 0);
