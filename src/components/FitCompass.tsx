import { LikeButton } from "@/components/LikeButton";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Disc3, Pause, Play, Plus, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addWish, removeWish, useWishlist } from "@/lib/wishlist";
import { STYLE_GENRES, type StyleGenre } from "@/lib/style-profile";
import { AXES, FIT_ITEMS, fitWishName, newVoterId, quadrantPoles, voteShares, type FitLook, type Quadrant } from "@/lib/fit-compass";
import { castStyleVote, getStyleVotes } from "@/lib/style-votes.functions";

import { SpotifyFrame } from "@/components/SpotifyFrame";
import { AccentMotif } from "@/components/AccentMotif";
import { useAlbumArt } from "@/lib/album-art";
import { STYLE_ACCENTS, accentFor, accentLink, type StyleAccent } from "@/lib/style-accents";

/** A look's song cover, small, in the corner of its compass tile. */
function TileArt({ spotify }: { spotify: string }) {
  const art = useAlbumArt(spotify);
  return art ? <img className="fc-look-art" src={art} alt="" loading="lazy" /> : null;
}

/** The moodboard's header: the look's song with its album art, which plays it. */
function SoundtrackHeader({ song, playing, onToggle }: { song: FitLook["song"]; playing: boolean; onToggle: () => void }) {
  const art = useAlbumArt(song.spotify);
  return (
    <button type="button" className="fc-sound" aria-pressed={playing} onClick={onToggle} aria-label={`${playing ? "Hide" : "Play"} ${song.title} by ${song.artist}`}>
      <span className="fc-sound-art">{art ? <img src={art} alt="" /> : <Disc3 aria-hidden />}<span className="fc-sound-play">{playing ? <Pause aria-hidden /> : <Play aria-hidden />}</span></span>
      <span className="fc-sound-text"><span className="fc-sound-kicker">The soundtrack</span><span className="fc-sound-title">{song.title}</span><span className="fc-sound-artist">{song.artist}</span></span>
    </button>
  );
}

/** The accessory the picked style brings, pinned to the moodboard's corner. A swipe moves through every style's piece,
 *  with the drawing sliding slower than its card for depth; picking a style chip brings its piece to the front. */
function AccentCorner({ accent, wantedId, onWant }: { accent: StyleAccent; wantedId: (a: StyleAccent) => string | undefined; onWant: (a: StyleAccent) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(accent.genre);
  const all = STYLE_GENRES.map(g => STYLE_ACCENTS[g]);
  const depth = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    el.querySelectorAll<HTMLElement>(".fc-accent-slide").forEach(slide => {
      const p = (slide.offsetLeft - el.scrollLeft) / w;
      slide.style.setProperty("--p", p.toFixed(3));
      slide.style.setProperty("--a", Math.min(1, Math.abs(p)).toFixed(3));
    });
    const i = Math.round(el.scrollLeft / w);
    const g = all[i]?.genre;
    if (g) setShown(g);
  }, [all]);
  useEffect(() => {
    const el = track.current;
    const i = STYLE_GENRES.indexOf(accent.genre);
    if (!el || i < 0) return;
    setShown(accent.genre);
    el.scrollTo({ left: i * el.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    depth();
  }, [accent.genre]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <aside className="fc-accent" aria-label={`Style accents, showing ${STYLE_ACCENTS[shown].genre}: ${STYLE_ACCENTS[shown].name}`}>
      <div className="fc-accent-track" ref={track} onScroll={depth} tabIndex={0} aria-roledescription="carousel">
        {all.map(a => {
          const wanted = !!wantedId(a);
          return (
            <section key={a.genre} className="fc-accent-slide" aria-label={`${a.genre} adds ${a.name}`} aria-hidden={a.genre !== shown} inert={a.genre !== shown}>
              <AccentMotif motif={a.motif} />
              <span className="fc-accent-kicker">{a.genre} adds</span>
              <span className="fc-accent-name">{a.name}</span>
              <span className="fc-accent-actions">
                <button type="button" aria-pressed={wanted} aria-label={wanted ? `${a.name} is in your Want List` : `Want the ${a.name.toLowerCase()}`} onClick={() => onWant(a)}>{wanted ? <Check aria-hidden /> : <Plus aria-hidden />}</button>
                <a href={accentLink(a)} target="_blank" rel="noreferrer" aria-label={`Shop ${a.name.toLowerCase()} on Farfetch`}><ArrowUpRight aria-hidden /></a>
              </span>
            </section>
          );
        })}
      </div>
      <span className="fc-accent-dots" aria-hidden>{all.map(a => <i key={a.genre} data-on={a.genre === shown} />)}</span>
    </aside>
  );
}
const ORDER: Quadrant[] = ["tl", "tr", "bl", "br"];
const VOTER_KEY = "fit-compass-voter";
let visitVoter = "";
function voterId() {
  try {
    let v = localStorage.getItem(VOTER_KEY);
    if (!v) { v = newVoterId(); localStorage.setItem(VOTER_KEY, v); }
    return v;
  } catch { return (visitVoter ||= newVoterId()); } // storage blocked: one id for this visit
}

/** The Fit Compass: one item in the centre, four ways to wear it on two style axes. */
export function FitCompass({ compact = false }: { compact?: boolean }) {
  const [itemId, setItemId] = useState(FIT_ITEMS[0]!.id);
  const item = FIT_ITEMS.find(i => i.id === itemId)!;
  const looks = ORDER.map(q => item.looks.find(l => l.quadrant === q)).filter(Boolean) as FitLook[];
  const [activeId, setActiveId] = useState(looks[0]!.id);
  const active = looks.find(l => l.id === activeId) ?? looks[0]!;
  const [playing, setPlaying] = useState<string | null>(null);
  const [filter, setFilter] = useState<StyleGenre[]>([]);
  const [votes, setVotes] = useState<{ counts: Record<string, number>; mine: string | null }>({ counts: {}, mine: null });
  const [voting, setVoting] = useState(false);
  const wishes = useWishlist();
  const rail = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    getStyleVotes({ data: { itemId, voter: voterId() } }).then(setVotes).catch(() => null);
  }, [itemId]);
  useEffect(() => { refresh(); }, [refresh]);

  const { shares, total, leader } = voteShares(votes.counts, looks.map(l => l.id));
  const dim = (l: FitLook) => filter.length > 0 && !l.genres.some(g => filter.includes(g));
  const wishId = (l: FitLook) => wishes.find(w => w.kind === "piece" && w.name === fitWishName(item, l) && w.from === "Style matrix")?.id;

  const pick = (l: FitLook) => {
    setActiveId(l.id);
    if (playing && playing !== l.id) setPlaying(null);
    const el = rail.current?.querySelector<HTMLElement>(`[data-look="${l.id}"]`);
    if (el && rail.current && getComputedStyle(rail.current).overflowX !== "visible") el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };
  const onKey = (e: React.KeyboardEvent) => {
    const i = ORDER.indexOf(active.quadrant);
    const map: Record<string, number> = { ArrowRight: i % 2 === 0 ? i + 1 : i, ArrowLeft: i % 2 === 1 ? i - 1 : i, ArrowDown: i < 2 ? i + 2 : i, ArrowUp: i >= 2 ? i - 2 : i };
    if (!(e.key in map)) return;
    e.preventDefault();
    const next = looks.find(l => l.quadrant === ORDER[map[e.key]!]);
    if (next) { pick(next); document.getElementById(`fc-${next.id}`)?.focus(); }
  };
  const toggleWish = (l: FitLook) => {
    const id = wishId(l);
    if (id) { removeWish(id); toast("Removed from your Want List"); return; }
    addWish({ kind: "piece", name: fitWishName(item, l), detail: `${l.num} — ${l.line}`, link: "", note: `Song: ${l.song.title} · ${l.song.artist}`, from: "Style matrix", ...(l.images[0] ? { image: l.images[0].src } : {}) });
    // Wanting a look is the strongest signal, so it also counts as this reader's vote for the Readers' pick.
    if (votes.mine !== l.id) { void vote(l, false); toast("Saved to your Want List · counted as your pick", { description: `${l.title} · ${item.name}` }); }
    else toast("Saved to your Want List", { description: `${l.title} · ${item.name}` });
  };
  const vote = async (l: FitLook, announce = true) => {
    setVoting(true);
    const prev = votes;
    const counts = { ...votes.counts };
    if (votes.mine) counts[votes.mine] = Math.max(0, (counts[votes.mine] ?? 1) - 1);
    counts[l.id] = (counts[l.id] ?? 0) + 1;
    setVotes({ counts, mine: l.id });
    try { await castStyleVote({ data: { itemId, lookId: l.id, voter: voterId() } }); if (announce) toast(`Voted: ${l.title}`); refresh(); }
    catch { setVotes(prev); toast("Your vote couldn't be saved. Try again."); }
    finally { setVoting(false); }
  };
  const poles = quadrantPoles(active.quadrant);
  const accent = accentFor(filter);
  const accentWish = (a: StyleAccent) => wishes.find(w => w.kind === "piece" && w.name === a.name && w.from === "Style matrix")?.id;
  const toggleAccent = (accent: StyleAccent) => {
    const id = accentWish(accent);
    if (id) { removeWish(id); toast("Removed from your Want List"); return; }
    addWish({ kind: "piece", name: accent.name, detail: `${accent.detail} · ${accent.genre} with ${active.title}`, link: accentLink(accent), note: `Song: ${active.song.title} · ${active.song.artist}`, from: "Style matrix" });
    toast("Saved to your Want List", { description: `${accent.name} · ${accent.genre}` });
  };

  return (
    <div className="fc" data-compact={compact}>
      {FIT_ITEMS.length > 1 && <div className="fc-items" role="tablist" aria-label="Hero items">
        {FIT_ITEMS.map(i => <button key={i.id} role="tab" aria-selected={i.id === itemId} className="fc-item" onClick={() => { setItemId(i.id); setActiveId(i.looks[0]!.id); setPlaying(null); }}>
          <img src={i.cover.src} alt="" style={{ objectPosition: i.cover.focus }} /><span>{i.name}</span></button>)}
      </div>}

      <div className="fc-stage">
        <div className="fc-compass" role="radiogroup" aria-label={`Four ways to wear ${item.name}`} onKeyDown={onKey} ref={rail}>
          <span className="fc-axis fc-axis-top">{AXES.top}</span><span className="fc-axis fc-axis-bottom">{AXES.bottom}</span>
          <span className="fc-axis fc-axis-left">{AXES.left}</span><span className="fc-axis fc-axis-right">{AXES.right}</span>
          {looks.map(l => (
            <button key={l.id} id={`fc-${l.id}`} data-look={l.id} data-q={l.quadrant} role="radio" aria-checked={l.id === active.id} tabIndex={l.id === active.id ? 0 : -1}
              className="fc-look" data-dim={dim(l)} onClick={() => pick(l)} aria-label={`${l.num}: ${l.title}, ${quadrantPoles(l.quadrant).x} and ${quadrantPoles(l.quadrant).y}`}>
              <img src={l.images[0]!.src} alt="" style={{ objectPosition: l.images[0]!.focus }} loading="lazy" />
              <TileArt spotify={l.song.spotify} />
              <span className="fc-look-num">{l.num}</span>
              <span className="fc-look-title">{l.title}</span>
              {leader === l.id && <span className="fc-pick"><Trophy aria-hidden />Readers' pick</span>}
              {total > 0 && <span className="fc-bar" aria-hidden><i style={{ width: `${shares[l.id]}%` }} /></span>}
            </button>
          ))}
          <div className="fc-core" aria-hidden>
            <img src={item.cover.src} alt="" style={{ objectPosition: item.cover.focus }} />
            <span>{item.name}</span>
          </div>
        </div>

        <article className="fc-panel" key={active.id} aria-live="polite">
          <p className="fc-panel-kicker">{active.num} · {poles.x} × {poles.y}</p>
          <h3 className="fc-panel-title">{active.title}</h3>
          <p className="fc-panel-line">Worn {active.line}</p>
          <div className="fc-board">
            <SoundtrackHeader song={active.song} playing={playing === active.id} onToggle={() => setPlaying(p => p === active.id ? null : active.id)} />
            <div className="fc-collage" data-count={active.images.length}>
              {active.images.map((im, j) => <img key={j} src={im.src} alt={im.alt} style={{ objectPosition: im.focus }} loading="lazy" />)}
              {accent && <AccentCorner accent={accent} wantedId={accentWish} onWant={toggleAccent} />}
            </div>
          </div>
          <div className="fc-palette" aria-label={`${active.title} palette`}>{active.palette.map(c => <span key={c} style={{ background: c }} title={c} />)}</div>
          <p className="fc-tags">{active.genres.join(" · ")}</p>
          <div className="fc-actions">
            <LikeButton kind="fashion" id={`fit-${item.id}-${active.id}`} name={active.title} sub={item.name} {...(active.images[0] ? { image: active.images[0].src } : {})} />
            <Button size="sm" variant={wishId(active) ? "secondary" : "default"} aria-pressed={!!wishId(active)} onClick={() => toggleWish(active)}>
              {wishId(active) ? <Check /> : <Plus />}{wishId(active) ? "In Want List" : "Want it · counts as my pick"}</Button>
            <Button size="sm" variant="secondary" disabled={voting} aria-pressed={votes.mine === active.id} onClick={() => void vote(active)}>
              {votes.mine === active.id ? <Check /> : <Trophy />}{votes.mine === active.id ? "Your way to wear it" : "My way to wear it"}</Button>
          </div>
          {playing === active.id && <SpotifyFrame title={`${active.song.title} on Spotify`} src={`https://open.spotify.com/embed/track/${active.song.spotify}?utm_source=generator&theme=0&autoplay=1`} width="100%" height="80" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" className="fc-player" />}
          {total > 0 && <p className="fc-votes">{shares[active.id]}% of {total} {total === 1 ? "vote" : "votes"} pick this way</p>}
        </article>
      </div>

      <div className="fc-filter" role="group" aria-label="Filter looks by style">
        {STYLE_GENRES.map(g => <button key={g} type="button" className="fc-chip" aria-pressed={filter.includes(g)} onClick={() => setFilter(f => f.includes(g) ? f.filter(x => x !== g) : [...f, g])}>{g}</button>)}
        {filter.length > 0 && <button type="button" className="fc-chip" onClick={() => setFilter([])}>Clear</button>}
      </div>
    </div>
  );
}
