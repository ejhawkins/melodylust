import { useState } from "react";
import type { LinkPreview } from "@/lib/link-preview";

/** A good read embedded as an article card: thumbnail, site, title and summary, the whole card one link. The board's own
 *  picture wins; otherwise the article's share image; otherwise the site's first letter. */
export function BoardReadCard({ item, preview }: { item: { name: string; detail: string; link: string; image: string }; preview?: LinkPreview | undefined }) {
  const [broken, setBroken] = useState<string[]>([]); // pictures that failed to load fall through to the next choice
  const image = [item.image, preview?.image ?? ""].find(src => src && !broken.includes(src)) ?? "";
  let host = "";
  try { host = new URL(item.link).hostname.replace(/^www\./, ""); } catch { /* no link */ }
  const site = preview?.site || host;
  const summary = item.detail || preview?.description || "";
  const body = <>
    <span className="ls-board-read-thumb" aria-hidden="true">{image ? <img key={image} src={image} alt="" loading="lazy" width={160} height={100} onError={() => setBroken(list => [...list, image])} /> : <span>{(site || item.name).charAt(0).toUpperCase()}</span>}</span>
    <span className="ls-board-read-text">
      {site && <span className="ls-board-read-site">{site}</span>}
      <span className="ls-board-item-name">{item.name}</span>
      {summary && <span className="ls-board-read-summary">{summary}</span>}
      {item.link && <span className="ls-board-read-cta">Read</span>}
    </span>
  </>;
  return item.link ? <a href={item.link} target="_blank" rel="noopener noreferrer nofollow" aria-label={`Read ${item.name}${site ? ` on ${site}` : ""}`}>{body}</a> : <div>{body}</div>;
}
