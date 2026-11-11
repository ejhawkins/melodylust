import { LikeButton } from "@/components/LikeButton";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Pause, Play, Plus, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addWish, removeWish, useWishlist } from "@/lib/wishlist";
import { STYLE_GENRES, type StyleGenre } from "@/lib/style-profile";
import { AXES, FIT_ITEMS, fitWishName, quadrantPoles, voteShares, type FitLook, type Quadrant } from "@/lib/fit-compass";
import { castStyleVote, getStyleVotes } from "@/lib/style-votes.functions";

const ORDER: Quadrant[] = ["tl", "tr", "bl", "br"];
const VOTER_KEY = "fit-compass-voter";
function voterId() {
  let v = localStorage.getItem(VOTER_KEY);
  if (!v) { v = crypto.randomUUID(); localStorage.setItem(VOTER_KEY, v); }
  return v;
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
          <div className="fc-collage">{active.images.map((im, j) => <img key={j} src={im.src} alt={im.alt} style={{ objectPosition: im.focus }} loading="lazy" />)}</div>
          <div className="fc-palette" aria-label={`${active.title} palette`}>{active.palette.map(c => <span key={c} style={{ background: c }} title={c} />)}</div>
          <p className="fc-tags">{active.genres.join(" · ")}</p>
          <div className="fc-actions">
            <LikeButton kind="fashion" id={`fit-${item.id}-${active.id}`} name={active.title} sub={item.name} {...(active.images[0] ? { image: active.images[0].src } : {})} />
            <Button size="sm" variant={wishId(active) ? "secondary" : "default"} aria-pressed={!!wishId(active)} onClick={() => toggleWish(active)}>
              {wishId(active) ? <Check /> : <Plus />}{wishId(active) ? "In Want List" : "Want it · counts as my pick"}</Button>
            <Button size="sm" variant="secondary" aria-pressed={playing === active.id} onClick={() => setPlaying(p => p === active.id ? null : active.id)}>
              {playing === active.id ? <Pause /> : <Play />}{playing === active.id ? "Hide song" : "Play the song"}</Button>
            <Button size="sm" variant="secondary" disabled={voting} aria-pressed={votes.mine === active.id} onClick={() => void vote(active)}>
              {votes.mine === active.id ? <Check /> : <Trophy />}{votes.mine === active.id ? "Your way to wear it" : "My way to wear it"}</Button>
          </div>
          <p className="fc-song">♪ {active.song.title} — {active.song.artist}</p>
          {playing === active.id && <iframe title={`${active.song.title} on Spotify`} src={`https://open.spotify.com/embed/track/${active.song.spotify}?utm_source=generator&theme=0&autoplay=1`} width="100%" height="80" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" className="fc-player" />}
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
