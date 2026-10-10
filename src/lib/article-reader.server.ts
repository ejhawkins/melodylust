import { lookup } from 'node:dns/promises';
import type { LookupAddress } from 'node:dns';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import ipaddr from 'ipaddr.js';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { articleAnalysisInputSchema } from './style-search';

export class ArticleReadError extends Error {}

const maxHTMLBytes = 2000000;

export async function resolveArticleURL(value: string, signal = AbortSignal.timeout(15000)) {
  let url: URL;
  try { url = new URL(value); }
  catch { throw new ArticleReadError('Use a valid public article URL.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) throw new ArticleReadError('Only public HTTP or HTTPS article URLs without credentials or custom ports are supported.');
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (hostname === 'localhost' || /\.(localhost|local|internal)$/.test(hostname)) throw new ArticleReadError('Local and private network URLs cannot be read.');
  signal.throwIfAborted();
  let addresses: LookupAddress[];
  try {
    addresses = await new Promise<LookupAddress[]>((resolve, reject) => {
      const abort = () => reject(new ArticleReadError('The article hostname lookup was cancelled or timed out.'));
      signal.addEventListener('abort', abort, { once: true });
      lookup(hostname, { all: true, verbatim: true }).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
    });
  }
  catch { throw new ArticleReadError('The article hostname could not be resolved.'); }
  if (!addresses.length || addresses.some(address => !ipaddr.isValid(address.address) || ipaddr.process(address.address).range() !== 'unicast')) throw new ArticleReadError('Local and private network URLs cannot be read.');
  const address = addresses[0];
  if (!address) throw new ArticleReadError('The article hostname could not be resolved.');
  return { url, address };
}

export function extractArticleText(html: Buffer | string, sourceURL: string) {
  if (Buffer.byteLength(html) > maxHTMLBytes) throw new ArticleReadError('The page exceeds the 2 MB reader limit.');
  const dom = new JSDOM(html, { url: sourceURL });
  try {
    const readable = new Readability(dom.window.document, { charThreshold: 100 }).parse();
    if (!readable?.textContent) throw new ArticleReadError('No readable article text was found.');
    const result = articleAnalysisInputSchema.safeParse({ title: readable.title || dom.window.document.title || new URL(sourceURL).hostname, url: sourceURL, text: readable.textContent });
    if (!result.success) throw new ArticleReadError('The page did not provide a usable article within the reader limits.');
    return result.data;
  } finally { dom.window.close(); }
}

function fetchPage(source: Awaited<ReturnType<typeof resolveArticleURL>>, signal: AbortSignal) {
  return new Promise<{ html: Buffer; location: string | undefined }>((resolve, reject) => {
    const request = source.url.protocol === 'https:' ? httpsRequest : httpRequest;
    const outgoing = request(source.url, {
      signal,
      headers: { Accept: 'text/html, application/xhtml+xml', 'Accept-Encoding': 'identity', 'User-Agent': 'MelodyLustArticleReader/1.0' },
      lookup: (_hostname, options, callback) => {
        if (options.all) callback(null, [source.address]);
        else callback(null, source.address.address, source.address.family);
      },
    }, response => {
      const status = response.statusCode ?? 0;
      if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
        response.destroy();
        resolve({ html: Buffer.alloc(0), location: response.headers.location });
        return;
      }
      if (status !== 200) {
        response.destroy();
        reject(new ArticleReadError(`The publisher returned HTTP ${status}. No login or paywall was bypassed.`));
        return;
      }
      if (!/^(text\/html|application\/xhtml\+xml)\b/i.test(response.headers['content-type'] ?? '')) {
        response.destroy(); reject(new ArticleReadError('The source did not return an HTML article.')); return;
      }
      const chunks: Buffer[] = [];
      let bytes = 0;
      response.on('data', (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > maxHTMLBytes) {
          response.destroy(); reject(new ArticleReadError('The page exceeds the 2 MB reader limit.')); return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve({ html: Buffer.concat(chunks), location: undefined }));
      response.on('error', () => reject(new ArticleReadError('The article download was interrupted. Try again.')));
    });
    outgoing.on('error', () => reject(new ArticleReadError('The article could not be downloaded or the request timed out.')));
    outgoing.end();
  });
}

export async function readPublicArticle(value: string, requestSignal: AbortSignal) {
  const signal = AbortSignal.any([requestSignal, AbortSignal.timeout(15000)]);
  let current = value;
  for (let redirect = 0; redirect <= 3; redirect++) {
    signal.throwIfAborted();
    const source = await resolveArticleURL(current, signal);
    signal.throwIfAborted();
    const page = await fetchPage(source, signal);
    if (page.location) { current = new URL(page.location, source.url).href; continue; }
    return extractArticleText(page.html, source.url.href);
  }
  throw new ArticleReadError('The source redirected too many times.');
}