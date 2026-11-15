import type { WishItem } from "@/lib/wishlist";
import { masonry, photoHeight } from "@/lib/share-masonry";

export type ShareFormat = "story" | "square" | "wide";
export const SHARE_SIZES: Record<ShareFormat, { w: number; h: number; label: string }> = {
  story: { w: 1080, h: 1920, label: "Story" },
  square: { w: 1080, h: 1350, label: "Threads / IG post" },
  wide: { w: 1600, h: 900, label: "X post" },
};

function css(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** The Want List as a shareable image, in the room's tokens like the Studio's and the stylist's cards: fig ground,
 *  chalk type, lilac fog for the quiet lines and acid lime for the marks, set in WTF Hammer and Isidora. */
export async function renderShareCard(items: WishItem[], format: ShareFormat): Promise<Blob> {
  const { w, h } = SHARE_SIZES[format];
  await Promise.all(["400 120px 'WTF Hammer Compressed'", "400 120px 'WTF Hammer XXX Compressed'", "500 36px Isidora", "900 italic 40px 'Couturier Poster'"]
    .map(f => document.fonts.load(f))).catch(() => undefined);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  const fig = css("--color-fig-black", "#0B040B"), fig8 = css("--color-fig-800", "#2D142B");
  const lime = css("--color-acid-lime", "#D4FF32"), chalk = css("--color-chalk-white", "#FAF9F6"), lilac = css("--color-lilac-fog", "#8E788C");
  const hammer = "'WTF Hammer Compressed', Impact, sans-serif";
  const xxx = "'WTF Hammer XXX Compressed', Impact, sans-serif";
  const sans = "Isidora, 'Helvetica Neue', Arial, sans-serif";

  const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, fig8); bg.addColorStop(1, fig);
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  const m = Math.round(w * (format === "wide" ? 0.03 : 0.045));

  const pad = m * 2;
  let y = pad + 20;
  // The wide card is short, so its type runs smaller than its width alone would give, leaving room for the lists.
  const s = format === "wide" ? 1.1 : w / 1080;
  g.fillStyle = lilac; g.textBaseline = "top";
  g.font = `500 ${18 * s}px ${sans}`; g.letterSpacing = `${6 * s}px`;
  g.fillText("MELODY LUST", pad, y);
  g.textAlign = "right"; g.fillText("MY EDIT", w - pad, y); g.textAlign = "left";
  y += 60 * s;
  // THE in the XXX cut, EDIT in Hammer, as the room sets its two-cut headlines.
  const size = (format === "wide" ? 110 : 160) * s;
  g.letterSpacing = "0px"; g.fillStyle = chalk;
  g.font = `400 ${size}px ${xxx}`; g.fillText("THE", pad, y);
  const lead = g.measureText("THE ").width;
  g.font = `400 ${size}px ${hammer}`; g.fillText("EDIT", pad + lead, y);
  y += size + 20 * s;
  g.fillStyle = lime; g.fillRect(pad, y, 80 * s, 4 * s); y += 44 * s;

  // The grid: a masonry of every saved piece and song. One with a photo the canvas may read shows it with its name and
  // detail underneath; one without (or whose photo won't load) is a text tile in the same columns.
  const pieces = items.filter(i => i.kind === "piece").length;
  const songs = items.length - pieces;
  g.fillStyle = lime; g.font = `500 ${16 * s}px ${sans}`; g.letterSpacing = `${5 * s}px`;
  g.fillText(`PIECES ${String(pieces).padStart(2, "0")}  ·  SONGS ${String(songs).padStart(2, "0")}`, pad, y);
  g.letterSpacing = "0px";
  y += 44 * s;

  const tilePad = 22 * s;
  const photos = await Promise.all(items.map(it => (it.image ? loadPhoto(it.image) : Promise.resolve(null))));
  const metaOf = (it: WishItem) => [it.detail, it.from && `for ${it.from}`].filter(Boolean).join(" · ");
  const more = 50 * s;
  const bottom = h - pad - 110 * s;
  // The wide card is too short to stack the grid under the headline, so it sits beside it, to the right.
  const wide = format === "wide";
  const gridLeft = wide ? Math.round(w * 0.36) : pad;
  const gridTop = wide ? pad + 20 + 60 * s : y;
  const gridW = w - pad - gridLeft;
  // A layout for a column count and a photo scale: photos keep their width and lose height as the scale drops.
  const layout = (cols: number, scale: number, room: number) => {
    const gap = 22 * s;
    const colW = (gridW - (cols - 1) * gap) / cols;
    const nameSize = (cols === 2 ? 30 : cols === 3 ? 24 : 20) * s, metaSize = (cols === 2 ? 22 : cols === 3 ? 18 : 16) * s;
    const caption = nameSize * 1.25 + metaSize * 1.3 + 14 * s;
    const photoH = items.map((_, i) => { const p = photos[i]; return p ? Math.round(photoHeight(colW, p.naturalWidth, p.naturalHeight) * scale) : 0; });
    const heights = items.map((it, i) => photoH[i]
      ? photoH[i]! + caption
      : tilePad * 2 + 30 * s + nameSize * 1.25 + (metaOf(it) ? metaSize * 1.3 : 0));
    return { colW, nameSize, metaSize, photoH, heights, ...masonry(heights, { left: gridLeft, top: gridTop, bottom: room, cols, colW, gap }) };
  };
  // The fullest photos that still fit everything: shrink them a step at a time, then try one more column; only a list
  // too long for even that ends in "+ N more".
  const base = format === "square" ? 3 : wide ? 3 : 2;
  let plan = layout(base, 1, bottom);
  for (const cols of [base, base + 1]) {
    for (const scale of [1, 0.9, 0.8, 0.7, 0.6, 0.5]) {
      const tried = layout(cols, scale, bottom);
      if (!tried.hidden) { plan = tried; break; }
    }
    if (!plan.hidden) break;
  }
  if (plan.hidden) plan = layout(base + 1, 0.5, bottom - more);
  const { colW, nameSize, metaSize, photoH, heights, spots, hidden } = plan;

  for (const { index, x, y: top } of spots) {
    const it = items[index]!;
    const photo = photos[index];
    const meta = metaOf(it);
    let ty = top;
    if (photo) {
      const ph = photoH[index]!;
      g.save(); g.beginPath(); g.roundRect(x, top, colW, ph, 14 * s); g.clip();
      cover(g, photo, x, top, colW, ph);
      g.restore();
      if (it.kind === "song") {
        g.fillStyle = lime; g.beginPath(); g.arc(x + colW - 30 * s, top + 30 * s, 18 * s, 0, Math.PI * 2); g.fill();
        g.fillStyle = fig; g.font = `500 ${20 * s}px ${sans}`; g.textAlign = "center";
        g.fillText("♪", x + colW - 30 * s, top + 19 * s); g.textAlign = "left";
      }
      ty = top + ph + 14 * s;
    } else {
      const th = heights[index]!;
      g.fillStyle = fig8; g.beginPath(); g.roundRect(x, top, colW, th, 14 * s); g.fill();
      g.strokeStyle = "rgba(250, 249, 246, 0.12)"; g.lineWidth = 2 * s; g.stroke();
      g.fillStyle = lime; g.font = `500 ${14 * s}px ${sans}`; g.letterSpacing = `${4 * s}px`;
      g.fillText(it.kind === "song" ? "♪ SONG" : "PIECE", x + tilePad, top + tilePad);
      g.letterSpacing = "0px";
      ty = top + tilePad + 30 * s;
    }
    const inset = photo ? 0 : tilePad;
    g.fillStyle = chalk; g.font = `500 ${nameSize}px ${sans}`;
    g.fillText(fit(g, it.name, colW - inset * 2), x + inset, ty);
    if (meta) {
      g.fillStyle = lilac; g.font = `500 ${metaSize}px ${sans}`;
      g.fillText(fit(g, meta, colW - inset * 2), x + inset, ty + nameSize * 1.25);
    }
  }
  if (hidden) {
    g.fillStyle = lilac; g.font = `500 ${24 * s}px ${sans}`;
    g.fillText(`+ ${hidden} more in my Want List`, gridLeft, bottom - more + 16 * s);
  }

  // The foot: the line in Couturier italic and the lime MELODYLUST pill the other cards sign off with.
  g.textBaseline = "alphabetic";
  g.fillStyle = lime; g.font = `900 italic ${30 * s}px 'Couturier Poster', serif`;
  g.fillText("Good style. Great music.", pad, h - pad - 4 * s);
  const pw = 300 * s, ph = 64 * s, px = w - pad - pw, py = h - pad - ph + 8 * s;
  g.fillStyle = lime; g.beginPath(); g.roundRect(px, py, pw, ph, ph / 2); g.fill();
  g.fillStyle = fig; g.font = `500 ${28 * s}px ${sans}`; g.textAlign = "center";
  g.fillText("♪ MELODYLUST", px + pw / 2, py + ph / 2 + 10 * s); g.textAlign = "left";
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error("render failed"))), "image/png"));
}

/** A saved photo the canvas may draw from, or null. It is asked for with CORS so the finished card can still be
 *  exported; a host that doesn't allow that, a broken link or a slow one (over four seconds) leaves a text tile. */
function loadPhoto(src: string): Promise<HTMLImageElement | null> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  const late = new Promise<null>(res => setTimeout(() => res(null), 4000));
  return Promise.race([img.decode().then(() => (img.naturalWidth ? img : null), () => null), late]);
}

/** Draws a photo filling the box, cropped from its centre, the way object-fit: cover would. */
function cover(g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, bw: number, bh: number) {
  const scale = Math.max(bw / img.naturalWidth, bh / img.naturalHeight);
  const sw = bw / scale, sh = bh / scale;
  g.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, bw, bh);
}

function fit(g: CanvasRenderingContext2D, t: string, max: number) {
  if (g.measureText(t).width <= max) return t;
  while (t.length > 1 && g.measureText(t + "…").width > max) t = t.slice(0, -1);
  return t + "…";
}

export async function shareOrDownload(blob: Blob, format: ShareFormat) {
  const file = new File([blob], `melody-lust-edit-${format}.png`, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "My Edit — Melody Lust" }); return "shared"; }
    catch (e) { if ((e as Error).name === "AbortError") return "cancelled"; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
