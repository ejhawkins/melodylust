import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { resolveArticleURL } from "./article-reader.server";
import { parseLinkPreview, type LinkPreview } from "./link-preview";

const MAX_BYTES = 512_000; // the share tags live in <head>; never read a whole long page
const TIMEOUT_MS = 6000;

type Source = Awaited<ReturnType<typeof resolveArticleURL>>;

/** One request to an address already checked as public, pinned to that address so DNS can't be swapped in between. */
function fetchHead(source: Source, signal: AbortSignal) {
  return new Promise<{ html: string; location?: string }>((resolve, reject) => {
    const request = source.url.protocol === "https:" ? httpsRequest : httpRequest;
    const outgoing = request(source.url, {
      signal,
      headers: { Accept: "text/html, application/xhtml+xml", "Accept-Encoding": "identity", "User-Agent": "MelodyLustLinkPreview/1.0" },
      lookup: (_hostname, options, callback) => {
        if (options.all) callback(null, [source.address]);
        else callback(null, source.address.address, source.address.family);
      },
    }, response => {
      const status = response.statusCode ?? 0;
      if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) { response.destroy(); resolve({ html: "", location: response.headers.location }); return; }
      if (status !== 200 || !/^(text\/html|application\/xhtml\+xml)\b/i.test(response.headers["content-type"] ?? "")) { response.destroy(); reject(new Error(`No HTML page (HTTP ${status}).`)); return; }
      const chunks: Buffer[] = [];
      let bytes = 0;
      const done = () => resolve({ html: Buffer.concat(chunks).toString("utf8") });
      response.on("data", (chunk: Buffer) => {
        chunks.push(chunk); bytes += chunk.length;
        // Enough once the head is closed, or once the cap is hit.
        if (bytes >= MAX_BYTES || /<\/head>/i.test(chunk.toString("latin1"))) { response.destroy(); done(); }
      });
      response.on("end", done);
      response.on("error", () => reject(new Error("The page download was interrupted.")));
    });
    outgoing.on("error", () => reject(new Error("The page could not be fetched.")));
    outgoing.end();
  });
}

/** The page's share card, or null when it can't be read (private address, not HTML, too slow, too many redirects). */
export async function fetchLinkPreview(value: string): Promise<LinkPreview | null> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  try {
    let current = value;
    for (let redirect = 0; redirect <= 3; redirect++) {
      const source = await resolveArticleURL(current, signal);
      const page = await fetchHead(source, signal);
      if (page.location) { current = new URL(page.location, source.url).href; continue; }
      return parseLinkPreview(page.html, source.url.href);
    }
  } catch { /* unreadable: the card falls back to what the board stored */ }
  return null;
}
