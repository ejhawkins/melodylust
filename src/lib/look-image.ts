// "See it on a model": up to three Farfetch product photos from an outfit idea become one AI image of an anonymous
// model wearing them together, styled for the season (FASHN's Agent Images). Client-safe: the input schema, the request FASHN receives, and the readers
// that turn its answers into what the page shows. No React, no credentials.
import { z } from 'zod';

/** Only product photos served by Farfetch's own image host may be sent, so this can't be used as a general image generator. */
const FARFETCH_IMAGES = 'cdn-images.farfetch-contents.com';
const isFarfetchImage = (value: string) => {
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === FARFETCH_IMAGES; } catch { return false; }
};

const text = (max: number) => z.string().trim().min(1).max(max);
export const LOOK_SEASONS = ['spring', 'summer', 'fall', 'winter'] as const;
export type LookSeason = typeof LOOK_SEASONS[number];
/** At most this many Farfetch pieces are sent, and worn together, per image. */
export const LOOK_MAX_PIECES = 3;

/** The season on a given day (northern hemisphere, by month). */
export const seasonFor = (date: Date): LookSeason => LOOK_SEASONS[Math.floor(((date.getMonth() + 10) % 12) / 3)]!;

export const lookImageInputSchema = z.object({
  /** One to three pieces from the idea: each a Farfetch photo and its name, e.g. "Dolce & Gabbana floral-jacquard mini dress". */
  pieces: z.array(z.object({
    image: z.string().max(400).refine(isFarfetchImage, 'A Farfetch product photo is required.'),
    name: text(160),
  })).min(1).max(LOOK_MAX_PIECES),
  /** The season the look is styled for. */
  season: z.enum(LOOK_SEASONS),
  /** The idea's title, as a mood: "Vintage Red Carpet Glamour". */
  mood: text(80).optional(),
});
export type LookImageInput = z.infer<typeof lookImageInputSchema>;

export type LookImageStatus = 'working' | 'ready' | 'failed' | 'not_configured' | 'rate_limited' | 'out_of_credits' | 'unavailable';
export type LookImageStart = { status: Exclude<LookImageStatus, 'ready' | 'failed'>; id: string | null } | { status: 'ready'; id: null; image: string };
export type LookImageResult = { status: 'working' | 'failed' | 'unavailable'; image: null } | { status: 'ready'; image: string };

/** A FASHN prediction id as it may be polled: letters, digits and dashes only, so it is safe in a URL path. */
export const lookIdSchema = z.string().regex(/^[A-Za-z0-9-]{8,80}$/);

const plain = (value: string) => value.replace(/[\r\n"]+/g, ' ').replace(/\s+/g, ' ').trim();

const ORDINALS = ['first', 'second', 'third'];
const SETTINGS: Record<LookSeason, string> = {
  spring: 'a fresh spring day, soft daylight, new green outdoors',
  summer: 'a bright summer day, warm sunlight',
  fall: 'an autumn day, golden light, a city street with fallen leaves',
  winter: 'a crisp winter day, cool light, a wintry city street',
};

/** The request body for FASHN's Agent Images run: up to three product photos worn together, styled for the season. Never names an artist: the model is anonymous. */
export function lookRequestBody(input: LookImageInput) {
  const pieces = input.pieces.slice(0, LOOK_MAX_PIECES);
  const worn = pieces.map((piece, index) => `the ${plain(piece.name)} from the ${ORDINALS[index]} image`).join(', ');
  const prompt = [
    'Make exactly one image: a full-length editorial fashion photograph of one anonymous professional model, not a real or recognisable person',
    `wearing ${pieces.length > 1 ? 'together, as one outfit, ' : ''}${worn}`,
    'Keep each product’s colour, cut and details as photographed',
    `Style and set the look for ${input.season}: ${SETTINGS[input.season]}. Add only what the season needs to complete the outfit, without hiding the products`,
    input.mood ? `Mood: ${plain(input.mood)}` : '',
    'No text, no logos, no extra images, no upscaling',
  ].filter(Boolean).join('. ');
  return { prompt, images: pieces.map(piece => piece.image), aspect_ratio: '3:4', resolution: '1k', generation_mode: 'fast', return_base64: false };
}

const record = (value: unknown): Record<string, unknown> | null => (value && typeof value === 'object' ? value as Record<string, unknown> : null);

/** FASHN's answer to starting a look: the id to poll, or why it did not start. `httpStatus` is the response's status code. */
export function readLookStart(httpStatus: number, payload: unknown): { id: string } | { status: 'out_of_credits' | 'rate_limited' | 'not_configured' | 'unavailable' } {
  const body = record(payload);
  const id = body?.['id'];
  if (httpStatus >= 200 && httpStatus < 300 && lookIdSchema.safeParse(id).success && !body?.['error']) return { id: id as string };
  const name = String(record(body?.['error'])?.['name'] ?? body?.['error'] ?? '');
  if (httpStatus === 401 || httpStatus === 403) return { status: 'not_configured' };
  if (httpStatus === 429) return { status: /OutOfCredits/i.test(name) ? 'out_of_credits' : 'rate_limited' };
  return { status: 'unavailable' };
}

/** Only images served from FASHN's own host over https are shown. */
export const isFashnImage = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  try { const url = new URL(value); return url.protocol === 'https:' && (url.hostname === 'fashn.ai' || url.hostname.endsWith('.fashn.ai')); } catch { return false; }
};

/** FASHN's answer to GET /v1/agent/status/{id}: still working, the finished image (the last one the Agent made), or failed. */
export function readLookStatus(payload: unknown): LookImageResult {
  const body = record(payload);
  const status = body?.['status'];
  if (status === 'starting' || status === 'in_queue' || status === 'processing') return { status: 'working', image: null };
  if (status === 'completed') {
    const images = (Array.isArray(body?.['predictions']) ? body['predictions'] : [])
      .filter(prediction => record(prediction)?.['tool'] === 'generate-image')
      .flatMap(prediction => { const results = record(prediction)?.['results']; return Array.isArray(results) ? results : []; })
      .filter(isFashnImage);
    const image = images.at(-1);
    return image ? { status: 'ready', image } : { status: 'failed', image: null };
  }
  return status === 'failed' ? { status: 'failed', image: null } : { status: 'unavailable', image: null };
}

/** A finished look's address, for fetching a copy to keep. */
export const lookImageUrlSchema = z.string().max(600).refine(isFashnImage, 'A FASHN image is required.');
