import { createServerFn } from '@tanstack/react-start';
import { lookIdSchema, lookImageInputSchema, lookImageUrlSchema, lookRequestBody, readLookStart, readLookStatus, type LookImageResult, type LookImageStart } from './look-image';
import { createRateLimiter } from './rate-limit';

const FASHN = 'https://api.fashn.ai/v1';
// Each image costs a FASHN credit, so each visitor gets a few an hour (memory, per server instance).
const limiter = createRateLimiter({ limit: 6, windowMs: 60 * 60_000 });
// Finished looks are reused for the same photo and wording while FASHN still hosts them (three days; kept for two).
const finished = new Map<string, { image: string; at: number }>();
const started = new Map<string, string>(); // prediction id → cache key
const KEEP_MS = 48 * 60 * 60_000;

async function call(url: string, apiKey: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, signal: controller.signal });
    return { status: response.status, payload: await response.json().catch(() => null) as unknown };
  } finally { clearTimeout(timer); }
}

/** A Farfetch photo's bytes as a data address. FASHN's Agent can't download from Farfetch's image host itself, so the photos are sent inline. */
async function inline(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, { redirect: 'error', signal: controller.signal });
    const type = (response.headers.get('content-type') ?? '').split(';')[0]!.trim();
    if (!response.ok || !/^image\/(jpeg|png|webp)$/.test(type)) throw new Error(`product photo unavailable (${response.status})`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 5 * 1024 * 1024) throw new Error('product photo too large');
    return `data:${type};base64,${bytes.toString('base64')}`;
  } finally { clearTimeout(timer); }
}

/** Starts an AI image of a model wearing up to three Farfetch pieces, styled for the season. Returns an id to poll with `checkLookImage`. The key is read here, on the server. */
export const startLookImage = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => lookImageInputSchema.parse(input))
  .handler(async ({ data }): Promise<LookImageStart> => {
    const apiKey = process.env['FASHN_API_KEY'];
    if (!apiKey) return { status: 'not_configured', id: null };
    const body = lookRequestBody(data);
    const key = `${body.images.join('|')}|${body.prompt}`;
    const cached = finished.get(key);
    if (cached && Date.now() - cached.at < KEEP_MS) return { status: 'ready', id: null, image: cached.image };
    const { clientKey } = await import('./client-key.server');
    if (!limiter.allow(await clientKey())) return { status: 'rate_limited', id: null };
    try {
      const images = await Promise.all(body.images.map(inline));
      const response = await call(`${FASHN}/agent/images/run`, apiKey, { method: 'POST', body: JSON.stringify({ ...body, images }) });
      const answer = readLookStart(response.status, response.payload);
      if (!('id' in answer)) {
        console.error('[Look image] did not start:', answer.status); // Server log only; never a key.
        return { status: answer.status, id: null };
      }
      if (started.size > 500) started.clear();
      started.set(answer.id, key);
      return { status: 'working', id: answer.id };
    } catch (failure) {
      console.error('[Look image] failed', failure instanceof Error ? failure.message : failure);
      return { status: 'unavailable', id: null };
    }
  });

/** Where a started look has got to: still working, the finished image, or failed. */
export const checkLookImage = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => lookIdSchema.parse(input))
  .handler(async ({ data: id }): Promise<LookImageResult> => {
    const apiKey = process.env['FASHN_API_KEY'];
    if (!apiKey) return { status: 'unavailable', image: null };
    try {
      const result = readLookStatus((await call(`${FASHN}/agent/status/${id}`, apiKey)).payload);
      const key = started.get(id);
      if (result.status === 'ready' && key) {
        if (finished.size > 500) finished.clear();
        finished.set(key, { image: result.image, at: Date.now() });
      }
      if (result.status !== 'working') started.delete(id);
      return result;
    } catch (failure) {
      console.error('[Look image] status failed', failure instanceof Error ? failure.message : failure);
      return { status: 'unavailable', image: null };
    }
  });

const COPY_MAX_BYTES = 6 * 1024 * 1024;

/** The finished image's bytes, as a data address, so the reader's browser can make its own small copy for the Want List
 *  (FASHN's host doesn't let a page read its images directly). Only FASHN's own images are fetched. Null when it can't be read. */
export const fetchLookCopy = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => lookImageUrlSchema.parse(input))
  .handler(async ({ data: url }): Promise<{ image: string | null }> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, { redirect: 'error', signal: controller.signal });
      const type = (response.headers.get('content-type') ?? '').split(';')[0]!.trim();
      if (!response.ok || !/^image\/(jpeg|png|webp)$/.test(type)) return { image: null };
      const bytes = Buffer.from(await response.arrayBuffer());
      return { image: bytes.length <= COPY_MAX_BYTES ? `data:${type};base64,${bytes.toString('base64')}` : null };
    } catch { return { image: null }; } finally { clearTimeout(timer); }
  });
