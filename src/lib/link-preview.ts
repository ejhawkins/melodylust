import { parseHTML } from "linkedom";

/** What a page says about itself for link cards: its share image, title, summary and site name. */
export type LinkPreview = { url: string; title: string; description: string; image: string; site: string };

const clip = (s: string | null | undefined, n: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

/** The image as an absolute https address, or "" (an http image would be blocked on the https site). */
function httpsImage(src: string, pageUrl: string): string {
  try {
    const url = new URL(src.trim(), pageUrl);
    if (url.protocol === "http:") url.protocol = "https:"; // most publishers serve both; anything else is dropped
    return url.protocol === "https:" ? url.href.slice(0, 500) : "";
  } catch { return ""; }
}

/** Read a page's Open Graph / Twitter card tags, falling back to its <title> and description. */
export function parseLinkPreview(html: string, pageUrl: string): LinkPreview {
  const { document } = parseHTML(html);
  const meta = (...keys: string[]) => {
    for (const key of keys) {
      const el = document.querySelector(`meta[property="${key}"], meta[name="${key}"]`);
      const content = el?.getAttribute("content");
      if (content?.trim()) return content;
    }
    return "";
  };
  let host = "";
  try { host = new URL(pageUrl).hostname.replace(/^www\./, ""); } catch { /* keep blank */ }
  const image = meta("og:image:secure_url", "og:image", "og:image:url", "twitter:image", "twitter:image:src");
  return {
    url: pageUrl,
    title: clip(meta("og:title", "twitter:title") || document.querySelector("title")?.textContent, 200),
    description: clip(meta("og:description", "twitter:description", "description"), 300),
    image: image ? httpsImage(image, pageUrl) : "",
    site: clip(meta("og:site_name"), 60) || host,
  };
}
