import type { FitLook } from "@/lib/fit-compass";

const loadImg = (src: string) => new Promise<HTMLImageElement | null>(r => {
  const img = new Image(); img.crossOrigin = "anonymous"; img.src = src;
  img.onload = () => r(img); img.onerror = () => r(null);
});
function cover(g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, rad: number, focus = "50% 50%") {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight), sw = w / s, sh = h / s;
  const [fx, fy] = focus.split(" ").map(p => (parseFloat(p) || 50) / 100) as [number, number];
  g.save(); g.beginPath(); g.roundRect(x, y, w, h, rad); g.clip();
  g.drawImage(img, (img.naturalWidth - sw) * fx, (img.naturalHeight - sh) * fy, sw, sh, x, y, w, h); g.restore();
}
function fitText(g: CanvasRenderingContext2D, text: string, max: number) {
  let t = text; while (t.length > 1 && g.measureText(t).width > max) t = t.slice(0, -2);
  return t === text ? t : `${t.trimEnd()}…`;
}

/** A 1080×1920 Story card: "Styled by", the look's photo and title, its palette and its song. */
export async function drawStylistCard(look: FitLook, item: string, stylist: string, link: string): Promise<Blob | null> {
  await Promise.all(["900 160px 'WTF Hammer XXX Compressed'", "500 48px Isidora", "900 italic 40px 'Couturier Poster'"].map(f => document.fonts?.load(f).catch(() => null)));
  const W = 1080, H = 1920, c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  const css = getComputedStyle(document.documentElement);
  const v = (n: string, d: string) => css.getPropertyValue(n).trim() || d;
  const fig = v("--color-fig-black", "#0B040B"), fig8 = v("--color-fig-800", "#2D142B"), fig9 = v("--color-fig-900", "#1F0D1E");
  const lime = v("--color-acid-lime", "#D4FF32"), chalk = v("--color-chalk-white", "#FAF9F6"), lilac = v("--color-lilac-fog", "#8E788C");
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, fig8); bg.addColorStop(1, fig);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.textAlign = "left";
  g.fillStyle = lime; g.font = "900 italic 44px 'Couturier Poster', serif"; g.fillText(fitText(g, `Styled by ${stylist}`, 800), 140, 190);
  const shot = look.images[0];
  const img = shot ? await loadImg(shot.src) : null;
  if (img) cover(g, img, 140, 240, 800, 900, 48, shot?.focus);
  else { g.fillStyle = fig9; g.beginPath(); g.roundRect(140, 240, 800, 900, 48); g.fill(); }
  g.fillStyle = lilac; g.font = "500 34px Isidora, sans-serif"; g.fillText(fitText(g, `${look.num} · ${item}`, 800), 140, 1210);
  g.fillStyle = chalk; g.font = "900 150px 'WTF Hammer XXX Compressed', Impact, sans-serif"; g.fillText(fitText(g, look.title.toUpperCase(), 800), 140, 1350);
  g.fillStyle = lilac; g.font = "500 36px Isidora, sans-serif"; g.fillText(fitText(g, look.line, 800), 140, 1405);
  look.palette.slice(0, 4).forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.arc(165 + i * 70, 1465, 25, 0, Math.PI * 2); g.fill(); });
  g.fillStyle = fig9; g.beginPath(); g.roundRect(140, 1520, 800, 110, 30); g.fill();
  g.fillStyle = lime; for (let i = 0; i < 14; i++) { const h = 14 + Math.abs(Math.sin(i * 1.7)) * 46; g.fillRect(175 + i * 13, 1575 - h / 2, 7, h); }
  g.fillStyle = chalk; g.font = "500 34px Isidora, sans-serif"; g.fillText(fitText(g, `♪ ${look.song.title}`, 520), 380, 1565);
  g.fillStyle = lilac; g.font = "500 28px Isidora, sans-serif"; g.fillText(fitText(g, look.song.artist, 520), 380, 1605);
  g.fillStyle = lilac; g.font = "500 30px Isidora, sans-serif"; g.fillText(`Listen: ${link.replace(/^https?:\/\//, "").slice(0, 48)}`, 140, 1690);
  g.fillStyle = lime; g.beginPath(); g.roundRect(140, 1730, 360, 80, 40); g.fill();
  g.fillStyle = fig; g.font = "500 34px Isidora, sans-serif"; g.fillText("♪ MELODYLUST", 180, 1782);
  return new Promise(r => { try { c.toBlob(b => r(b), "image/png"); } catch { r(null); } });
}
