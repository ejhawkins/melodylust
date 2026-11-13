import type { WishItem } from "@/lib/wishlist";

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

  const pieces = items.filter(i => i.kind === "piece");
  const songs = items.filter(i => i.kind === "song");
  const cols = format === "wide" ? 2 : 1;
  const colW = (w - pad * 2 - (cols - 1) * 60 * s) / cols;
  const bottom = h - pad - 110 * s;

  const block = (title: string, list: WishItem[], x: number, startY: number, limit: number) => {
    let yy = startY;
    g.fillStyle = lime; g.font = `500 ${16 * s}px ${sans}`; g.letterSpacing = `${5 * s}px`;
    g.fillText(`${title.toUpperCase()}  ${String(list.length).padStart(2, "0")}`, x, yy);
    yy += 44 * s; g.letterSpacing = "0px";
    for (const [n, it] of list.entries()) {
      if (yy > limit - 70 * s) { g.fillStyle = lilac; g.font = `500 ${24 * s}px ${sans}`; g.fillText(`+ ${list.length - n} more`, x, yy); yy += 40 * s; break; }
      g.fillStyle = lime; g.font = `400 ${30 * s}px ${hammer}`;
      g.fillText(String(n + 1).padStart(2, "0"), x, yy + 4 * s);
      g.fillStyle = chalk; g.font = `500 ${34 * s}px ${sans}`;
      g.fillText(fit(g, it.name, colW - 56 * s), x + 56 * s, yy);
      yy += 46 * s;
      const meta = [it.detail, it.from && `for ${it.from}`].filter(Boolean).join(" · ");
      if (meta) { g.fillStyle = lilac; g.font = `500 ${22 * s}px ${sans}`; g.fillText(fit(g, meta, colW - 56 * s), x + 56 * s, yy); yy += 34 * s; }
      yy += 18 * s;
    }
    return yy;
  };

  if (cols === 2) {
    block("Pieces", pieces, pad, y, bottom);
    block("Playlist", songs, pad + colW + 60 * s, y, bottom);
  } else {
    const split = songs.length ? y + (bottom - y) * (pieces.length ? 0.58 : 0) : bottom;
    let yy = pieces.length ? block("Pieces", pieces, pad, y, songs.length ? split : bottom) + 20 * s : y;
    if (songs.length) block("Playlist", songs, pad, Math.max(yy, y), bottom);
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
