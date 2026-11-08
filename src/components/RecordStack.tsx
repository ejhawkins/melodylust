import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Play } from "lucide-react";
import coverChihiro from "@/assets/sleeve-chihiro.jpg";
import coverBanks from "@/assets/sleeve-banks.jpg";
import coverCudi from "@/assets/sleeve-cudi.jpg";
import coverSolange from "@/assets/sleeve-solange.jpg";
import coverWeeknd from "@/assets/sleeve-weeknd.jpg";

type Video = { id: string; artist: string; title: string; credit: string; url: string; cover: string; creditLink?: { label: string; href: string }; stylist?: { name: string; role: string; href?: string }; tags: string[]; theme: string };

const videos: Video[] = [
  { id: "BY_XwvKogC8", artist: "Billie Eilish", title: "CHIHIRO", credit: "Official Music Video · Styling by", cover: coverChihiro, creditLink: { label: "Andrew Mukamal", href: "https://www.streeters.com/artists/styling/andrew-mukamal" }, url: "https://www.youtube.com/watch?v=BY_XwvKogC8", stylist: { name: "Andrew Mukamal", role: "Stylist", href: "https://www.streeters.com/artists/styling/andrew-mukamal" }, tags: ["Album", "2024"], theme: "The Ivy League" },
  { id: "5n8qzxUKQIs", artist: "BANKS", title: "This Is What It Feels Like", credit: "Goddess: Unplugged · ℗ 2024", cover: coverBanks, url: "https://music.youtube.com/watch?v=5n8qzxUKQIs", tags: ["Session", "2024"], theme: "Red Room" },
  { id: "VrDfSZ_6f4U", artist: "Kid Cudi", title: "Day 'N' Nite", credit: "Official Music Video · 2009", cover: coverCudi, url: "https://www.youtube.com/watch?v=VrDfSZ_6f4U", tags: ["Single", "2009"], theme: "Night Drive" },
  { id: "S0qrinhNnOM", artist: "Solange", title: "Cranes in the Sky", credit: "A Seat at the Table · 2016", cover: coverSolange, url: "https://www.youtube.com/watch?v=S0qrinhNnOM", tags: ["Album", "2016"], theme: "Paper Sun" },
  { id: "4NRXx6U8ABQ", artist: "The Weeknd", title: "Blinding Lights", credit: "After Hours · 2020", cover: coverWeeknd, url: "https://www.youtube.com/watch?v=4NRXx6U8ABQ", tags: ["Album", "2020"], theme: "Neon Rush" },
];

/** The music videos of "This is a mood", also listed in the listening room's library. */
export { videos as moodVideos, type Video as MoodVideo };

export function RecordStack() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState<number | null>(null);
  const v = videos[active] ?? videos[0]!;
  const root = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [drag, setDrag] = useState({ x: 0, y: 0, on: false });
  const start = useRef<{ x: number; y: number; moved: boolean; dx: number } | null>(null);
  const justDragged = useRef(false);
  useEffect(() => {
    const el = root.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setInView(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el); return () => io.disconnect();
  }, []);
  const down = (e: PointerEvent<HTMLButtonElement>) => { start.current = { x: e.clientX, y: e.clientY, moved: false, dx: 0 }; e.currentTarget.setPointerCapture(e.pointerId); setDrag({ x: 0, y: 0, on: true }); };
  const move = (e: PointerEvent) => { const s = start.current; if (!s) return; const x = e.clientX - s.x, y = e.clientY - s.y; s.dx = x; if (Math.abs(x) + Math.abs(y) > 6) s.moved = true; setDrag({ x, y, on: true }); };
  const up = () => { const s = start.current; start.current = null; justDragged.current = !!s?.moved; if (s?.moved && Math.abs(s.dx) > 80) { pick((active + 1) % videos.length); } setDrag({ x: 0, y: 0, on: false }); };

  const pick = (i: number) => { if (i !== active) setPlaying(null); setActive(i); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); pick((active + 1) % videos.length); }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); pick((active - 1 + videos.length) % videos.length); }
  };

  return (
    <div className="records" ref={root} data-in={inView}>
      <div className="records-stack" role="tablist" aria-label="Music videos" onKeyDown={onKey}>
        {videos.map((r, i) => {
          const offset = (i - active + videos.length) % videos.length;
          return (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`${r.artist} — ${r.title}`}
              tabIndex={i === active ? 0 : -1}
              className="record"
              data-active={i === active}
              data-dragging={i === active && drag.on}
              style={{ ["--i" as string]: offset, ["--dx" as string]: i === active ? `${drag.x}px` : "0px", ["--dy" as string]: i === active ? `${drag.y}px` : "0px", zIndex: videos.length - offset }}
              onPointerDown={i === active ? down : undefined}
              onPointerMove={i === active ? move : undefined}
              onPointerUp={i === active ? up : undefined}
              onPointerCancel={i === active ? up : undefined}
              onClick={(e) => { if (justDragged.current) { justDragged.current = false; e.preventDefault(); return; } if (i !== active) pick(i); }}
            >
              <span className="record-disc" aria-hidden />
              <span className="record-sleeve">
                <img src={r.cover} alt={`Album cover artwork for ${r.title} by ${r.artist}`} loading="lazy" width={1024} height={1024} />
              </span>
            </button>
          );
        })}
      </div>
      <div className="records-player" role="tabpanel">
        <div className="film-frame">
          {playing === active ? (
            <iframe
              key={v.id}
              src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`}
              title={`${v.artist} — ${v.title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <button type="button" className="film-poster" onClick={() => setPlaying(active)} aria-label={`Play ${v.artist} — ${v.title}`}>
              <img src={`https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg`} alt={`Still from ${v.title} by ${v.artist}`} loading="lazy" />
              <span className="film-play"><Play aria-hidden /> PLAY THE FILM</span>
            </button>
          )}
        </div>
        <p className="records-credit">
          <a className="film-link" href={v.url} target="_blank" rel="noreferrer">{v.title} · {v.artist}</a>
          <span>{v.credit}{v.creditLink && <> <a className="film-link" href={v.creditLink.href} target="_blank" rel="noreferrer">{v.creditLink.label}</a></>}</span>
        </p>
      </div>
      <div className="records-spec">
        <h3 className="records-row">
          <span className="records-row-main">{v.stylist ? <>{v.stylist.href ? <a className="film-link" href={v.stylist.href} target="_blank" rel="noreferrer">{v.stylist.name}</a> : v.stylist.name}, {v.stylist.role}</> : "Stylist not listed"}</span>
          <span className="records-pills">{v.tags.map(t => <span className="records-pill" key={t}>{t}</span>)}</span>
        </h3>
        <h3 className="records-row"><span className="records-row-main">{v.title}</span></h3>
        <h3 className="records-row"><span className="records-row-main">{v.artist}</span></h3>
        <h3 className="records-theme"><span>{v.theme}</span></h3>
      </div>
    </div>
  );
}
