// Seeds Contentful for the genre editions: creates and publishes the `story` content type, then publishes the journal's
// Hip-Hop stories from src/data/home.ts with their images as assets. Run once against the space:
//   npx tsx scripts/contentful/seed-stories.ts
// Reads CONTENTFUL_SPACE_ID and CONTENTFUL_MANAGEMENT_TOKEN (a personal CMA token) from .env; the token travels only in
// headers and is never printed. Stops without changing anything if a `story` type already exists. Re-running skips
// stories whose title is already published.
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
const GENRES = ['Hip-Hop', 'Pop', 'R&B', 'Electronic', 'Rock', 'Indie', 'Jazz', 'Country'];
const CATEGORIES = ['Style', 'Music', 'Fashion', 'Runway'];
const SEED_GENRE = 'Hip-Hop';

type Json = Record<string, unknown>;
async function cma(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Json> {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/vnd.contentful.management.v1+json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const json = (text ? JSON.parse(text) : {}) as Json;
  if (!response.ok) throw new Error(`${method} ${path} → ${response.status} ${(json['sys'] as Json | undefined)?.['id'] ?? ''} ${json['message'] ?? ''}`);
  return json;
}
const version = (entity: Json) => String((entity['sys'] as Json)['version']);
const sysId = (entity: Json) => String((entity['sys'] as Json)['id']);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ——— 1. The content type ———
async function ensureStoryType() {
  const existing = await fetch(`${BASE}/content_types/story`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (existing.ok) {
    const type = await existing.json() as { fields: { id: string; type: string; required?: boolean }[] };
    console.error('A `story` content type already exists; leaving it untouched. Its fields:');
    for (const f of type.fields) console.error(`  - ${f.id} (${f.type}${f.required ? ', required' : ''})`);
    process.exit(2);
  }
  if (existing.status !== 404) throw new Error(`Checking for story type → ${existing.status}`);

  const created = await cma('PUT', '/content_types/story', {
    name: 'Story',
    description: 'A journal story for the Listening Room’s genre editions.',
    displayField: 'title',
    fields: [
      { id: 'title', name: 'Title', type: 'Symbol', required: true, localized: false },
      { id: 'genre', name: 'Genre', type: 'Symbol', required: true, localized: false, validations: [{ in: GENRES }] },
      { id: 'category', name: 'Category', type: 'Symbol', required: false, localized: false, validations: [{ in: CATEGORIES }] },
      { id: 'intro', name: 'Intro', type: 'Text', required: true, localized: false },
      { id: 'body', name: 'Body', type: 'RichText', required: true, localized: false, validations: [
        { enabledNodeTypes: ['heading-1', 'heading-2', 'heading-3', 'heading-4', 'heading-5', 'heading-6', 'ordered-list', 'unordered-list', 'hr', 'blockquote', 'embedded-asset-block', 'hyperlink'], message: 'Headings, lists, quotes, links and embedded images.' },
        { enabledMarks: ['bold', 'italic', 'underline'] },
      ] },
      { id: 'image', name: 'Image', type: 'Link', linkType: 'Asset', required: false, localized: false, validations: [{ linkMimetypeGroup: ['image'] }] },
      { id: 'date', name: 'Date', type: 'Date', required: false, localized: false },
    ],
  });
  await cma('PUT', '/content_types/story/published', undefined, { 'X-Contentful-Version': version(created) });
  // Date-only picker for the date field.
  const editor = await cma('GET', '/content_types/story/editor_interface');
  const controls = (editor['controls'] as Json[]).map(c => c['fieldId'] === 'date' ? { ...c, widgetId: 'datePicker', widgetNamespace: 'builtin', settings: { format: 'dateonly' } } : c);
  await cma('PUT', '/content_types/story/editor_interface', { controls }, { 'X-Contentful-Version': version(editor) });
  console.log('Created and published content type `story`.');
}

// ——— 2. The stories ———
type Story = { id: number; category: string; genre: string; title: string; image: string; date: string; intro: string; body: string };

/** The stories as home.ts holds them, with each image as the path or URL it imports; no component code is run. */
async function loadStories(): Promise<Story[]> {
  const source = readFileSync(resolve(root, 'src/data/home.ts'), 'utf8');
  const imports = new Map<string, string>();
  for (const m of source.matchAll(/^import (\w+) from "@\/assets\/([^"]+)";/gm)) imports.set(m[1]!, resolve(root, 'src/assets', m[2]!));
  const block = source.slice(source.indexOf('export const stories = ['), source.indexOf('];', source.indexOf('export const stories = [')));
  const stories: Story[] = [];
  for (const m of block.matchAll(/\{ id: (\d+), category: "([^"]+)", genre: "([^"]+)", title: "((?:[^"\\]|\\.)*)", image: (\w+|"[^"]+"), date: "([^"]+)", intro: "((?:[^"\\]|\\.)*)", body: "((?:[^"\\]|\\.)*)" \}/g)) {
    const unescape = (s: string) => JSON.parse(`"${s}"`) as string;
    const image = m[5]!.startsWith('"') ? m[5]!.slice(1, -1) : imports.get(m[5]!) ?? '';
    stories.push({ id: Number(m[1]), category: m[2]!, genre: m[3]!, title: unescape(m[4]!), image, date: m[6]!, intro: unescape(m[7]!), body: unescape(m[8]!) });
  }
  return stories;
}

const isoDate = (pretty: string) => {
  const d = new Date(`${pretty} UTC`);
  if (Number.isNaN(d.getTime())) throw new Error(`Unreadable date: ${pretty}`);
  return d.toISOString().slice(0, 10);
};
const richText = (body: string) => ({
  nodeType: 'document', data: {},
  content: body.split('\n\n').map(p => ({ nodeType: 'paragraph', data: {}, content: [{ nodeType: 'text', value: p, marks: [], data: {} }] })),
});

async function uploadImage(story: Story): Promise<string> {
  const slug = story.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let file: Json;
  if (/^https?:\/\//.test(story.image)) {
    const url = new URL(story.image);
    file = { contentType: 'image/jpeg', fileName: `${slug}.jpg`, upload: url.toString() };
  } else {
    const bytes = readFileSync(story.image);
    const ext = story.image.split('.').pop()!.toLowerCase();
    const upload = await fetch(`https://upload.contentful.com/spaces/${encodeURIComponent(SPACE!)}/uploads`, {
      method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/octet-stream' }, body: bytes,
    });
    if (!upload.ok) throw new Error(`Upload → ${upload.status}`);
    const uploaded = await upload.json() as Json;
    file = { contentType: ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/jpeg', fileName: `${slug}.${ext}`, uploadFrom: { sys: { type: 'Link', linkType: 'Upload', id: sysId(uploaded) } } };
  }
  const asset = await cma('POST', '/assets', { fields: { title: { 'en-US': story.title }, file: { 'en-US': file } } });
  const id = sysId(asset);
  await cma('PUT', `/assets/${id}/files/en-US/process`, undefined, { 'X-Contentful-Version': version(asset) });
  for (let tries = 0; tries < 20; tries++) {
    await sleep(1500);
    const processed = await cma('GET', `/assets/${id}`);
    const fileNow = ((processed['fields'] as Json)['file'] as Json)['en-US'] as Json;
    if (fileNow['url']) { await cma('PUT', `/assets/${id}/published`, undefined, { 'X-Contentful-Version': version(processed) }); return id; }
  }
  throw new Error(`Asset ${id} never finished processing`);
}

async function seed() {
  const stories = (await loadStories()).filter(s => s.genre === SEED_GENRE);
  if (!stories.length) throw new Error(`No ${SEED_GENRE} stories found in src/data/home.ts`);
  const published = await cma('GET', '/entries?content_type=story&limit=100');
  const have = new Set((published['items'] as Json[]).map(e => String(((e['fields'] as Json)['title'] as Json)?.['en-US'] ?? '')));
  for (const story of stories) {
    if (have.has(story.title)) { console.log(`Skipping (already there): ${story.title}`); continue; }
    const imageId = await uploadImage(story);
    const entry = await cma('POST', '/entries', {
      fields: {
        title: { 'en-US': story.title },
        genre: { 'en-US': story.genre },
        category: { 'en-US': story.category },
        intro: { 'en-US': story.intro },
        body: { 'en-US': richText(story.body) },
        image: { 'en-US': { sys: { type: 'Link', linkType: 'Asset', id: imageId } } },
        date: { 'en-US': isoDate(story.date) },
      },
    }, { 'X-Contentful-Content-Type': 'story' });
    await cma('PUT', `/entries/${sysId(entry)}/published`, undefined, { 'X-Contentful-Version': version(entry) });
    console.log(`Published: ${story.title} (home.ts id ${story.id})`);
  }
}

await ensureStoryType();
await seed();
console.log('Done.');
