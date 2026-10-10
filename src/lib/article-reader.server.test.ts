import { beforeEach, describe, expect, it, vi } from 'vitest';
import { extractArticleText, readPublicArticle, resolveArticleURL } from './article-reader.server';

const mockedLookup = vi.hoisted(() => vi.fn());
vi.mock('node:dns/promises', () => ({ lookup: mockedLookup, default: { lookup: mockedLookup } }));
beforeEach(() => vi.clearAllMocks());

describe('Public article URL reader', () => {
  it('resolves a public address for a pinned HTTP request', async () => {
    mockedLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    const source = await resolveArticleURL('https://example.com/article');
    expect(source.address).toEqual({ address: '93.184.216.34', family: 4 });
    expect(source.url.href).toBe('https://example.com/article');
  });

  it('rejects non-web URLs, credentials, custom ports and local names', async () => {
    for (const url of ['file:///private/article', 'https://user:password@example.com', 'https://example.com:3000', 'http://localhost', 'http://printer.local']) {
      await expect(resolveArticleURL(url)).rejects.toThrow();
    }
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it('rejects private, loopback, link-local, mapped IPv6 and mixed public/private DNS answers', async () => {
    for (const address of ['127.0.0.1', '10.0.0.252', '192.168.1.1', '169.254.169.254', '::1', 'fc00::1', '::ffff:127.0.0.1']) {
      mockedLookup.mockResolvedValue([{ address, family: address.includes(':') ? 6 : 4 }]);
      await expect(resolveArticleURL('https://example.com/article')).rejects.toThrow('private network');
    }
    mockedLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }, { address: '10.0.0.1', family: 4 }]);
    await expect(resolveArticleURL('https://example.com/article')).rejects.toThrow('private network');
  });

  it('extracts article text without executing scripts or including navigation', () => {
    const text = 'Usher wore a white tailored jacket with crystal detailing. The outfit paired a structured silhouette with a bright finish for the performance.';
    const html = `<html><head><title>Supplied article test</title></head><body><nav>Unrelated navigation</nav><article><h1>Supplied article test</h1><p>${text}</p><p>${text}</p></article><script>throw new Error('must not run')</script></body></html>`;
    const article = extractArticleText(html, 'https://example.com/article');
    expect(article.text).toContain(text);
    expect(article.text).not.toContain('Unrelated navigation');
    expect(article.text).not.toContain('must not run');
    expect(article.url).toBe('https://example.com/article');
  });

  it('rejects oversized or unreadable pages and cancelled requests', async () => {
    expect(() => extractArticleText('x'.repeat(2000001), 'https://example.com')).toThrow('2 MB');
    expect(() => extractArticleText('<html><body></body></html>', 'https://example.com')).toThrow('No readable');
    const controller = new AbortController();
    controller.abort();
    await expect(readPublicArticle('https://example.com', controller.signal)).rejects.toThrow();
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it('does not keep waiting on DNS after cancellation', async () => {
    mockedLookup.mockImplementation(() => new Promise(() => {}));
    const controller = new AbortController();
    const reading = resolveArticleURL('https://example.com', controller.signal);
    controller.abort();
    await expect(reading).rejects.toThrow('hostname could not be resolved');
  });
});