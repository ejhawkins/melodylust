import { describe, expect, it } from 'vitest';
import { lookImageInputSchema, lookImageUrlSchema, lookRequestBody, readLookStart, readLookStatus, seasonFor } from './look-image';

const image = 'https://cdn-images.farfetch-contents.com/27/16/35/81/27163581_57882667_400.jpg';

describe('seasonFor', () => {
  it('names the season by month', () => {
    expect([0, 2, 5, 8, 10, 11].map(month => seasonFor(new Date(2026, month, 13)))).toEqual(['winter', 'spring', 'summer', 'fall', 'fall', 'winter']);
  });
});

describe('lookImageInputSchema', () => {
  it('accepts one to three Farfetch product photos and refuses any other image', () => {
    const piece = { image, name: 'Dolce & Gabbana mini dress' };
    expect(lookImageInputSchema.safeParse({ pieces: [piece], season: 'fall' }).success).toBe(true);
    expect(lookImageInputSchema.safeParse({ pieces: [piece, piece, piece, piece], season: 'fall' }).success).toBe(false);
    expect(lookImageInputSchema.safeParse({ pieces: [], season: 'fall' }).success).toBe(false);
    for (const other of ['https://example.com/a.jpg', 'http://cdn-images.farfetch-contents.com/a.jpg', 'https://cdn-images.farfetch-contents.com.evil.test/a.jpg', 'data:image/png;base64,AAAA'])
      expect(lookImageInputSchema.safeParse({ pieces: [{ image: other, name: 'dress' }], season: 'fall' }).success).toBe(false);
  });
});

describe('lookRequestBody', () => {
  it('sends up to three product photos to be worn together, styled for the season, as one fast image', () => {
    const body = lookRequestBody(lookImageInputSchema.parse({ pieces: [{ image, name: 'Dolce & Gabbana "tassel"\ndress' }, { image: image.replace('27163581_', '36223015_'), name: 'Clearweather sandals' }], season: 'fall', mood: 'Vintage Red Carpet Glamour' }));
    expect(body).toMatchObject({ images: [image, image.replace('27163581_', '36223015_')], resolution: '1k', generation_mode: 'fast', return_base64: false });
    expect(body.prompt).toContain('the Dolce & Gabbana tassel dress from the first image, the Clearweather sandals from the second image');
    expect(body.prompt).toContain('for fall');
    expect(body.prompt).toContain('exactly one image');
    expect(body.prompt).toContain('anonymous');
  });
});

describe('readLookStart', () => {
  it('returns the id to poll', () => {
    expect(readLookStart(200, { id: '123a87r9-4129-4bb3-be18-9c9fb5bd7fc1-u1', error: null })).toEqual({ id: '123a87r9-4129-4bb3-be18-9c9fb5bd7fc1-u1' });
  });
  it('names why a look did not start', () => {
    expect(readLookStart(401, { error: 'AuthenticationError', message: 'Unauthorized: Invalid token' })).toEqual({ status: 'not_configured' });
    expect(readLookStart(429, { error: 'OutOfCredits' })).toEqual({ status: 'out_of_credits' });
    expect(readLookStart(429, { error: 'RateLimitExceeded' })).toEqual({ status: 'rate_limited' });
    expect(readLookStart(200, { id: '../etc', error: null })).toEqual({ status: 'unavailable' });
    expect(readLookStart(500, null)).toEqual({ status: 'unavailable' });
  });
});

describe('readLookStatus', () => {
  it('reads working, finished and failed answers', () => {
    expect(readLookStatus({ status: 'processing' })).toEqual({ status: 'working', image: null });
    expect(readLookStatus({ status: 'completed', predictions: [{ tool: 'generate-image', results: ['https://cdn.fashn.ai/abc/output_0.jpg'] }] })).toEqual({ status: 'ready', image: 'https://cdn.fashn.ai/abc/output_0.jpg' });
    expect(readLookStatus({ status: 'failed', error: { name: 'ImageLoadError' } })).toEqual({ status: 'failed', image: null });
    expect(readLookStatus({})).toEqual({ status: 'unavailable', image: null });
  });
  it('shows only images from FASHN’s own host', () => {
    expect(readLookStatus({ status: 'completed', predictions: [{ tool: 'generate-image', results: ['https://cdn.fashn.ai/abc/first.jpg'] }, { tool: 'generate-image', results: ['https://media.fashn.ai/api/abc/output_0.jpg'] }, { tool: 'image-upscale', results: ['https://cdn.fashn.ai/abc/up.jpg'] }] })).toEqual({ status: 'ready', image: 'https://media.fashn.ai/api/abc/output_0.jpg' });
    expect(lookImageUrlSchema.safeParse('https://media.fashn.ai/api/abc/output_0.jpg').success).toBe(true);
    expect(lookImageUrlSchema.safeParse('https://fashn.ai.evil.test/x.jpg').success).toBe(false);
    expect(readLookStatus({ status: 'completed', predictions: [{ tool: 'generate-image', results: ['https://evil.test/x.jpg'] }] })).toEqual({ status: 'failed', image: null });
    expect(readLookStatus({ status: 'completed', predictions: [{ tool: 'generate-image', results: ['http://cdn.fashn.ai/x.jpg'] }] })).toEqual({ status: 'failed', image: null });
  });
});
