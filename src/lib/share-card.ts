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

export async function renderShareCard(items: WishItem[], format: ShareFormat): Promise<Blob> {
  const { w, h } = SHARE_SIZES[format];
  await Promise.all([
    document.fonts.load('400 80px "Bodoni Moda"'),
    document.fonts.load('italic 400 40px "Bodoni Moda"'),
  ]).catch(() => undefined);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  const ink = css("--foreground", "#111");
  const paper = css("--background", "#fff");
  const accent = css("--primary", "#c4502a");
  const serif = '"Bodoni Moda", Didot, Georgia, serif';
  const sans = "Helvetica Neue, Arial, sans-serif";

  // white frame + inner page
  g.fillStyle = paper; g.fillRect(0, 0, w, h);
  const m = Math.round(w * 0.045);
  g.strokeStyle = ink; g.lineWidth = 2; g.strokeRect(m, m, w - m * 2, h - m * 2);

  const pad = m * 2;
  let y = pad + 20;
  const s = w / 1080;
  g.fillStyle = ink; g.textBaseline = "top";
  g.font = `500 ${18 * s}px ${sans}`; g.letterSpacing = `${6 * s}px`;
  g.fillText("MELODY LUST", pad, y);
  g.textAlign = "right"; g.fillText("MY EDIT", w - pad, y); g.textAlign = "left";
  y += 60 * s;
  g.font = `400 ${(format === "wide" ? 84 : 120) * s}px ${serif}`; g.letterSpacing = "0px";
  g.fillText("The Edit", pad, y);
  y += (format === "wide" ? 110 : 150) * s;
  g.fillStyle = accent; g.fillRect(pad, y, 80 * s, 3 * s); y += 40 * s;

  const pieces = items.filter(i => i.kind === "piece");
  const songs = items.filter(i => i.kind === "song");
  const cols = format === "wide" ? 2 : 1;
  const colW = (w - pad * 2 - (cols - 1) * 60 * s) / cols;
  const bottom = h - pad - 60 * s;

  const block = (title: string, list: WishItem[], x: number, startY: number, limit: number) => {
    let yy = startY;
    g.fillStyle = ink; g.font = `600 ${16 * s}px ${sans}`; g.letterSpacing = `${5 * s}px`;
    g.fillText(`+ ${title.toUpperCase()}  ${String(list.length).padStart(2, "0")}`, x, yy);
    yy += 44 * s; g.letterSpacing = "0px";
    for (const [n, it] of list.entries()) {
      if (yy > limit - 70 * s) { g.font = `italic 400 ${24 * s}px ${serif}`; g.fillText(`+ ${list.length - n} more`, x, yy); yy += 40 * s; break; }
      g.fillStyle = accent; g.font = `500 ${16 * s}px ${sans}`;
      g.fillText(String(n + 1).padStart(2, "0"), x, yy + 8 * s);
      g.fillStyle = ink; g.font = `400 ${36 * s}px ${serif}`;
      g.fillText(fit(g, it.name, colW - 56 * s), x + 56 * s, yy);
      yy += 46 * s;
      const meta = [it.detail, it.from && `for ${it.from}`].filter(Boolean).join(" · ");
      if (meta) { g.font = `italic 400 ${22 * s}px ${serif}`; g.globalAlpha = .65; g.fillText(fit(g, meta, colW - 56 * s), x + 56 * s, yy); g.globalAlpha = 1; yy += 34 * s; }
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

  g.fillStyle = ink; g.font = `italic 400 ${24 * s}px ${serif}`;
  g.fillText("Good style. Great music.", pad, h - pad - 20 * s);
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
