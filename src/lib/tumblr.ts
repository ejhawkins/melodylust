// Pure, browser-safe helpers for turning a Tumblr API payload into the
// small card shape the journal uses. Kept separate from the server function
// so it can be unit-tested without a key.

export type TumblrPost = {
  id: string;
  url: string;
  type: string;
  title: string;
  excerpt: string;
  image: string | null;
  alt: string;
  timestamp: number;
  tags: string[];
};

type Size = { url?: string; width?: number; height?: number };
type Block = { type?: string; text?: string; alt?: string; media?: Size[] };
type Trail = { content?: Block[] };
type Photo = { caption?: string; alt_text?: string; alt_sizes?: Size[]; orig_size?: Size };
type RawPost = {
  id?: string | number;
  post_url?: string;
  url?: string;
  type?: string;
  timestamp?: number | string;
  tags?: unknown;
  content?: Block[];
  trail?: Trail[];
  photos?: Photo[];
  title?: string;
  body?: string;
  quote?: string;
  link_text?: string;
  link_description?: string;
  answer?: string;
  summary?: string;
  video_thumbnail_url?: string;
};

const clamp = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, "")}…` : text;

/** Credit-style digests ("Publication: Dior Magazine Photographer: …") carry a usable
 *  heading in their first labelled run — split it from the credits that follow. */
const splitDigest = (summary: string) => {
  const first = summary
    .split(/\r?\n/)
    .map((s) => s.trim())
    .find(Boolean) ?? "";
  const label = first.match(/^([A-Za-z][A-Za-z &'\-]{1,24}):\s*/);
  const afterLabel = label ? first.slice(label[0].length) : first;
  const next = afterLabel.search(/\b[A-Z][a-z]{2,}\s*:/);
  const head = (next >= 1 ? afterLabel.slice(0, next) : afterLabel).trim();
  const from = summary.indexOf(first) + (label?.[0].length ?? 0) + head.length;
  return { head, tail: from > 0 ? summary.slice(from) : "" };
};

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  ldquo: "“", rdquo: "”", bdquo: "„", lsquo: "‘", rsquo: "’", sbquo: "‚",
  mdash: "—", ndash: "–", hellip: "…", middot: "·", bull: "•",
  copy: "©", reg: "®", trade: "™", deg: "°", laquo: "«", raquo: "»",
  times: "×", divide: "÷", frac12: "½", euro: "€", pound: "£",
  acirc: "â", aacute: "á", agrave: "à", auml: "ä", atilde: "ã", aring: "å",
  ecirc: "ê", eacute: "é", egrave: "è", euml: "ë",
  icirc: "î", iacute: "í", igrave: "ì", iuml: "ï",
  ocirc: "ô", oacute: "ó", ograve: "ò", ouml: "ö", otilde: "õ",
  ucirc: "û", uacute: "ú", ugrave: "ù", uuml: "ü",
  yacute: "ý", yuml: "ÿ", ntilde: "ñ", ccedil: "ç", szlig: "ß",
};

const fromCode = (code: number) => {
  if (code <= 0 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
};

/** Tumblr's legacy post formats store text as HTML with named and numeric entities. */
const decodeEntities = (text: string) =>
  text
    .replace(/&#x([0-9a-f]{1,6});/gi, (_, hex: string) => fromCode(parseInt(hex, 16)))
    .replace(/&#(\d{1,7});/g, (_, digits: string) => fromCode(parseInt(digits, 10)))
    .replace(/&([a-z][a-z0-9]{1,9});/gi, (match, name: string) => NAMED[name.toLowerCase()] ?? match);

/** Tumblr appends a hidden "ALT" label after figures; it must not reach a heading. */
const ALT_HELPER =
  /<span[^>]*class="[^"]*tmblr-alt-text-helper[^"]*"[^>]*>[\s\S]*?<\/span>/gi;

const stripHtml = (html: string) =>
  decodeEntities(
    html
      .replace(ALT_HELPER, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/p>/gi, " ")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();

/** Neue Post Format text carries lightweight markers instead of HTML. */
const stripMarkers = (text: string) =>
  text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s*>\s?/gm, "")
    .replace(/[*_~`]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asPost = (value: unknown): RawPost => (isRecord(value) ? (value as RawPost) : {});

const arr = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const attr = (tag: string, name: string) =>
  new RegExp(`${name}="([^"]*)"`, "i").exec(tag)?.[1] ?? "";

/** Legacy HTML posts keep their photo inline in the body. */
const collectInlineImages = (html: string, sizes: Size[]) => {
  const alts: string[] = [];
  (html.match(/<img\b[^>]*>/gi) ?? []).forEach((tag) => {
    const src = attr(tag, "src");
    if (src) sizes.push({ url: src, width: 640, height: 640 });
    const alt = attr(tag, "alt");
    if (alt) alts.push(stripHtml(alt));
  });
  return alts.find((a) => a.length > 0) ?? "";
};

/** Pick the rendition closest to a comfortable card size, never the giant original. */
const pickImage = (sizes: Size[]): string | null => {
  const usable = sizes.filter((s) => typeof s?.url === "string" && s.url.length > 0);
  if (usable.length === 0) return null;
  const score = (s: Size) => Math.abs((s.width ?? 640) - 640);
  const best = usable.slice().sort((a, b) => score(a) - score(b))[0];
  return best?.url ?? null;
};

const textBlocks = (blocks: Block[]) =>
  blocks
    .flatMap((b) => (b?.type === "text" && typeof b.text === "string" ? [stripMarkers(b.text)] : []))
    .filter(Boolean)
    .join(" ");

const collectImages = (blocks: Block[], sizes: Size[]) => {
  blocks.forEach((b) => {
    if (b?.type !== "image") return;
    sizes.push(...arr<Size>(b.media));
  });
};

const firstAlt = (blocks: Block[]) =>
  blocks.find((b) => typeof b?.alt === "string" && b.alt.length > 0)?.alt ?? "";

export const mapPost = (value: unknown): TumblrPost | null => {
  const raw = asPost(value);
  const url = raw.post_url ?? raw.url ?? "";
  if (!url) return null;

  const type = raw.type ?? "text";
  const content = arr<Block>(raw.content);
  const photos = arr<Photo>(raw.photos);
  const legacyBody = raw.body ?? "";

  const sizes: Size[] = [];
  collectImages(content, sizes);
  collectImages(
    arr<Trail>(raw.trail).flatMap((t) => arr<Block>(t?.content)),
    sizes,
  );
  photos.forEach((photo) => {
    if (photo?.orig_size) sizes.push(photo.orig_size);
    sizes.push(...arr<Size>(photo?.alt_sizes));
  });
  if (raw.video_thumbnail_url) sizes.push({ url: raw.video_thumbnail_url, width: 500, height: 375 });
  const inlineAlt = collectInlineImages(legacyBody, sizes);

  const photoCaption = photos
    .map((p) => stripHtml(p?.caption ?? ""))
    .filter(Boolean)
    .join(" ");

  const legacyTitle = stripHtml(raw.title ?? "");
  const bodyHtml = stripHtml(legacyBody);
  const quoteText = stripHtml(raw.quote ?? "");
  const linkText = stripHtml(raw.link_text ?? "");
  const linkDescription = stripHtml(raw.link_description ?? "");
  const answerText = stripHtml(raw.answer ?? "");
  const summary = stripHtml(raw.summary ?? "");
  const npfText = textBlocks(content);

  // Tumblr's own plain-text digest beats scraping its markup.
  const body =
    npfText ||
    (type === "quote" ? quoteText : "") ||
    summary ||
    bodyHtml ||
    quoteText ||
    linkDescription ||
    photoCaption ||
    answerText;

  const { head: headline, tail } = splitDigest(raw.summary ?? "");

  const title =
    legacyTitle ||
    linkText ||
    (quoteText ? clamp(quoteText, 60) : "") ||
    headline ||
    clamp(body, 60) ||
    (type === "photo" ? "Photo" : "") ||
    "Untitled";

  // When the heading came out of the summary, the excerpt carries what follows it
  // rather than repeating the same words.
  const rest = stripHtml(tail);
  const excerpt =
    type === "quote" && quoteText ? quoteText : clamp(body === title ? "" : rest || body, 170);

  const stamp = typeof raw.timestamp === "number" ? raw.timestamp : Number(raw.timestamp ?? 0);
  const timestamp = Number.isFinite(stamp) ? stamp : 0;

  const alt =
    firstAlt(content) ||
    photos.map((p) => stripHtml(p?.alt_text ?? "")).find(Boolean) ||
    inlineAlt ||
    clamp(body || title, 110) ||
    "Post on Tumblr";

  return {
    id: String(raw.id ?? url),
    url,
    type,
    title: clamp(title, 90),
    excerpt,
    image: pickImage(sizes),
    alt,
    timestamp,
    tags: arr<unknown>(raw.tags).filter((t): t is string => typeof t === "string"),
  };
};

export const mapTumblrPosts = (payload: unknown): TumblrPost[] => {
  const root = isRecord(payload) ? payload : {};
  const source = isRecord(root["response"]) ? root["response"] : root;
  return arr<unknown>(source["posts"])
    .map(mapPost)
    .filter((post): post is TumblrPost => post !== null);
};

/** RSS carries each post's HTML either XML-escaped or inside CDATA. */
const unescapeXml = (text: string) => {
  const cdata = /^\s*<!\[CDATA\[([\s\S]*)\]\]>\s*$/.exec(text);
  if (cdata) return cdata[1] ?? "";
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&amp;/g, "&");
};

const element = (xml: string, name: string) =>
  new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i").exec(xml)?.[1] ?? "";

/** Comments, video embeds and hidden "visit the post" notes never belong on a card. */
const cleanBody = (html: string) =>
  html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "")
    .replace(/<(p|div|span)\b[^>]*display\s*:\s*none[^>]*>[\s\S]*?<\/\1>/gi, "");

/** Keeps one credit per line ("Publication: …", "Photographer: …") so splitDigest can read them.
 *  Some posts carry a heading tag split up by Tumblr's editor ("<p><</p><p>h3>"): a "<" that
 *  starts no tag is kept as text, and the decoded fragment is dropped with the other tags. */
const toLines = (html: string) =>
  decodeEntities(
    html
      .replace(/<(?![a-z!/?])/gi, "&lt;")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|h[1-6]|div|li)>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/<\s*\/?\s*[a-z][a-z0-9]*\b[^>]*>/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();

/** The blog's public RSS feed, used when no API key is set: same card shape as the API. */
export const mapTumblrRss = (xml: string): TumblrPost[] =>
  xml
    .split(/<item>/i)
    .slice(1)
    .map((chunk) => {
      const item = chunk.split(/<\/item>/i)[0] ?? "";
      const url = unescapeXml(element(item, "link")).trim();
      const html = cleanBody(unescapeXml(element(item, "description")));
      const date = Date.parse(unescapeXml(element(item, "pubDate")).trim());
      const tags = [...item.matchAll(/<category>([\s\S]*?)<\/category>/gi)]
        .map((m) => unescapeXml(m[1] ?? "").trim())
        .filter(Boolean);
      return mapPost({
        id: /\/post\/(\d+)/.exec(url)?.[1] ?? url,
        post_url: url,
        type: /<img\b/i.test(html) ? "photo" : "text",
        timestamp: Number.isFinite(date) ? Math.floor(date / 1000) : 0,
        tags,
        body: html,
        summary: toLines(html),
      });
    })
    .filter((post): post is TumblrPost => post !== null);

/** Deterministic so server and client render the same string. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const formatDay = (timestamp: number) => {
  if (!timestamp) return "";
  const d = new Date(timestamp * 1000);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()] ?? "Jan"} ${d.getUTCFullYear()}`;
};

