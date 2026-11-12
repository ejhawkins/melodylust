import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Pause, Play, Shirt, X } from "lucide-react";
import { GenreMark } from "@/components/GenreMark";
import { Button } from "@/components/ui/button";
import { songLooks } from "@/data/home";
import { capsuleMap, type MapKind, type MapNode } from "@/lib/capsule-map";
import { capsuleTree, mixSongs, roomPool, type CapsuleBranch } from "@/lib/capsule-tree";
import { LEXICON, blendName, type Genre } from "@/lib/genre-shapes";
import type { MixSong } from "@/lib/listening-room";
import { useWishlist } from "@/lib/wishlist";

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const num = (i: number) => String(i + 1).padStart(2, "0");

/**
 * The Capsule as an editorial tree, opened from Your Library: each sound the reader saved pieces from, branching to the
 * pieces it dressed and on to songs that share its genres. A sound and its picks play through the room's bar as one queue.
 * With nothing saved yet, the mix's own looks stand in, marked as an example.
 */
export function ListenCapsule({ mix, nowPlaying, onPlay, onWantList, onBack }: {
  mix: readonly MixSong[];
  nowPlaying?: string | undefined;
  onPlay: (queue: MixSong[], index: number) => void;
  onWantList: () => void;
  onBack: () => void;
}) {
  const saved = useWishlist();
  const tree = useMemo(() => {
    return capsuleTree({ saved, songs: mixSongs(mix), pool: roomPool(mix), looks: songLooks });
  }, [saved, mix]);
  const pieces = tree.branches.reduce((n, b) => n + b.pieces.length, 0);
  const picks = tree.branches.reduce((n, b) => n + b.picks.length, 0);
  const sounds = tree.branches.filter(b => b.sound).length;
  const blend = blendName(tree.genres);

  return (
    <article className="ls-board ls-cap" aria-labelledby="ls-cap-title">
      <header className="ls-board-head">
        <GenreMark genres={tree.genres} className="ls-cap-mark" title={blend ? `Your capsule's sound: ${blend}` : undefined} />
        <div>
          <p className="ls-kicker">Your Library · {tree.example ? "An example capsule" : "Capsule"}</p>
          <h1 id="ls-cap-title" className="ls-cap-title"><span className="ls-cap-the">The</span> Capsule</h1>
          <p className="ls-board-meta">{[count(sounds, "sound"), count(pieces, "piece"), `${count(picks, "song")} to play next`].join(" · ")}</p>
          {blend && <p className="ls-cap-blend">Built on {blend}.</p>}
        </div>
      </header>

      {tree.example && (
        <p className="ls-cap-intro">Nothing saved yet, so here are the mix’s own looks. Save a piece from a song’s look and your capsule grows from that song.</p>
      )}

      <KeywordMap tree={tree} nowPlaying={nowPlaying} onPlay={onPlay} />

      <h2 className="ls-cap-section">The tree</h2>
      <ol className="ls-cap-tree" role="list">
        {tree.branches.map((branch, i) => (
          <Branch key={branch.id} branch={branch} index={i} nowPlaying={nowPlaying} onPlay={onPlay} />
        ))}
      </ol>

      <div className="ls-look-actions">
        <Button variant="listenCategory" size="chip" onClick={onWantList}>Open your Want List</Button>
        <Button variant="listenCategory" size="chip" onClick={onBack}>Back to the feed</Button>
      </div>
    </article>
  );
}

function Branch({ branch, index, nowPlaying, onPlay }: { branch: CapsuleBranch; index: number; nowPlaying?: string | undefined; onPlay: (queue: MixSong[], index: number) => void }) {
  const { sound } = branch;
  // The sound leads its own queue, its picks after it; a loose branch is just its picks.
  const queue = [...(sound ? [sound] : []), ...branch.picks.map(p => p.song)];
  const offset = sound ? 1 : 0;
  const titleId = `ls-cap-sound-${index}`;
  return (
    <li className="ls-cap-branch" aria-labelledby={titleId}>
      <div className="ls-cap-sound" data-active={sound ? nowPlaying === sound.caption : undefined}>
        <span className="ls-cap-num" aria-hidden>{num(index)}</span>
        <p className="ls-cap-label">The sound</p>
        {sound ? <>
          <img className="ls-cap-art" src={sound.art} alt="" width={120} height={120} loading="lazy" />
          <h2 id={titleId} className="ls-cap-sound-title">{sound.title}</h2>
          <p className="ls-cap-by">{sound.artist}</p>
          <ul className="ls-cap-genres" role="list">
            {sound.genres.map(g => <li key={g}><GenreMark genres={{ [g]: 1 }} className="ls-cap-genre-mark" />{LEXICON[g].name} <span>· {g}</span></li>)}
          </ul>
          <Button variant="listenInk" size="bar" className="ls-cap-play" onClick={() => onPlay(queue, 0)}><Play className="fill-current" aria-hidden />Play the sound</Button>
        </> : <>
          <h2 id={titleId} className="ls-cap-sound-title">Found on their own</h2>
          <p className="ls-cap-by">Pieces saved without a song. Your capsule’s sound picks their music.</p>
        </>}
      </div>

      <div className="ls-cap-limbs">
        <section className="ls-cap-limb" aria-label={`Pieces from ${sound?.title ?? "no song"}`}>
          <p className="ls-cap-label">The style</p>
          <ul className="ls-cap-nodes" role="list">
            {branch.pieces.map(piece => (
              <li key={piece.id} className="ls-cap-node">
                <span className="ls-cap-thumb">{piece.image ? <img src={piece.image} alt="" width={56} height={56} loading="lazy" /> : <Shirt aria-hidden />}</span>
                <span className="ls-cap-node-text"><span className="ls-cap-node-title">{piece.name}</span>{piece.detail && <span className="ls-cap-node-sub">{piece.detail}</span>}</span>
              </li>
            ))}
          </ul>
        </section>

        {branch.picks.length > 0 && (
          <section className="ls-cap-limb" aria-label={`Songs to play after ${sound?.title ?? "these pieces"}`}>
            <p className="ls-cap-label">Play next</p>
            <ol className="ls-cap-nodes" role="list">
              {branch.picks.map((pick, j) => {
                const live = nowPlaying === pick.song.caption;
                return (
                  <li key={pick.song.caption} className="ls-cap-node ls-cap-pick">
                    <Button variant="listenTile" size="block" className="ls-cap-pick-btn w-full" data-active={live}
                      aria-label={`Play ${pick.song.title} by ${pick.song.artist}`} onClick={() => onPlay(queue, offset + j)}>
                      <span className="ls-cap-thumb"><img src={pick.song.art} alt="" width={56} height={56} loading="lazy" /></span>
                      <span className="ls-cap-node-text">
                        <span className="ls-cap-node-title">{pick.song.title}</span>
                        <span className="ls-cap-node-sub">{pick.song.artist}</span>
                        <span className="ls-cap-why">Shares {pick.shared.map(g => LEXICON[g].name.toLowerCase()).join(" and ")}</span>
                      </span>
                      <span className="ls-runway-play" aria-hidden><Play /></span>
                    </Button>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </div>
    </li>
  );
}

const LEGEND: { kind: MapKind; label: string }[] = [
  { kind: "genre", label: "Genre" }, { kind: "sound", label: "Sound" }, { kind: "piece", label: "Style" }, { kind: "pick", label: "Play next" },
];
const VIEW = { x: -720, y: -400, w: 1440, h: 800 };
const pct = (n: MapNode) => ({ left: `${((n.x - VIEW.x) / VIEW.w) * 100}%`, top: `${((n.y - VIEW.y) / VIEW.h) * 100}%` });
/** Which side of its dot a word sits on: outward from the centre, so the words read away from the lines. */
const sideOf = (n: MapNode) => (n.kind === "root" ? "root" : Math.abs(n.x) < 30 ? (n.y < 0 ? "above" : "below") : n.x > 0 ? "right" : "left");

// Filler styling copy for the cards, one line per genre, until the editors write the real notes.
const GENRE_NOTES: Record<Genre, string> = {
  "Hip-Hop": "Wear it boxy: a heavy hoodie, a wide leg, one loud chain.",
  Pop: "Wear it bright: one colour head to toe and a shoe that shines.",
  "R&B": "Wear it soft: satin, a slip of skin, gold close to the neck.",
  Electronic: "Wear it sharp: technical nylon, reflective trim, a hard silhouette.",
  Rock: "Wear it worn in: leather that has lived, a boot with a buckle.",
  Indie: "Wear it found: a thrifted knit, a tote, a collar a little off true.",
  Jazz: "Wear it tailored: a soft shoulder, a roll-neck, something in brown.",
  Country: "Wear it Western: denim on denim, a pointed toe, a big buckle.",
};
const PIECE_NOTES = [
  "Filler note: build the outfit around this piece and keep the rest quiet.",
  "Filler note: wear it two ways, once for the day and once after dark.",
  "Filler note: it pairs with the darkest thing in your wardrobe.",
];

/** The capsule's keywords as a radial node map: genres round the centre, sounds beside their genres, and each sound's
 *  pieces and next songs on the outer ring. Each word floats gently and opens a card when tapped; the tree below
 *  holds the same things in full. */
function KeywordMap({ tree, nowPlaying, onPlay }: { tree: Parameters<typeof capsuleMap>[0]; nowPlaying?: string | undefined; onPlay: (queue: MixSong[], index: number) => void }) {
  const map = useMemo(() => capsuleMap(tree), [tree]);
  const byId = new Map(map.nodes.map(n => [n.id, n]));
  const [openId, setOpenId] = useState<string | null>(null);
  const [still, setStill] = useState(false);
  const cardId = useId();
  const open = openId ? byId.get(openId) : undefined;
  // Where the map is wider than the screen it scrolls sideways; it opens on the capsule at its centre.
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = frame.current; if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2; }, []);
  // Escape closes the card and hands focus back to its word.
  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenId(null);
      frame.current?.querySelector<HTMLElement>(`[data-node="${CSS.escape(openId)}"]`)?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openId]);

  return (
    <figure className="ls-cap-map">
      <div className="ls-cap-map-top">
        <h2 className="ls-cap-section">The keyword map</h2>
        <Button variant="listenCategory" size="chip" aria-pressed={still} onClick={() => setStill(s => !s)}>
          {still ? <Play aria-hidden /> : <Pause aria-hidden />}{still ? "Let them float" : "Hold still"}
        </Button>
      </div>
      <div className="ls-cap-map-scroll" ref={frame}>
        <div className="ls-cap-map-stage" data-still={still} onClick={e => { if (e.target === e.currentTarget) setOpenId(null); }}>
          <svg viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} aria-hidden="true">
            {map.edges.map(e => {
              const a = byId.get(e.from), b = byId.get(e.to);
              if (!a || !b) return null;
              // A gentle bow toward the centre, like a hand-drawn mind map.
              const cx = (a.x + b.x) / 2 * 0.86, cy = (a.y + b.y) / 2 * 0.86;
              const lit = openId === e.from || openId === e.to;
              return <path key={`${e.from}>${e.to}`} data-kind={b.kind} data-lit={lit} d={`M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}`} />;
            })}
          </svg>
          {map.nodes.map((n, i) => (
            <button key={n.id} type="button" className="ls-cap-word" data-kind={n.kind} data-side={sideOf(n)} data-node={n.id}
              data-live={n.song ? nowPlaying === n.song.caption : undefined}
              aria-expanded={openId === n.id} aria-controls={openId === n.id ? cardId : undefined}
              style={{ ...pct(n), ["--float-i" as string]: i % 7 }}
              onClick={() => setOpenId(id => (id === n.id ? null : n.id))}>
              <span className="ls-cap-float"><i aria-hidden />{n.label}</span>
            </button>
          ))}
          {open && <NodeCard id={cardId} node={open} tree={tree} nowPlaying={nowPlaying} onPlay={onPlay} onClose={() => setOpenId(null)} />}
        </div>
      </div>
      <figcaption>
        <ul className="ls-cap-legend" role="list">
          {LEGEND.map(l => <li key={l.kind} data-kind={l.kind}><span aria-hidden />{l.label}</li>)}
        </ul>
        <p className="ls-cap-map-hint">Tap a word to read about it.</p>
      </figcaption>
    </figure>
  );
}

/** A word's card, opened beside it and toward the middle of the map so it stays inside the frame. */
function NodeCard({ id, node, tree, nowPlaying, onPlay, onClose }: { id: string; node: MapNode; tree: Parameters<typeof capsuleMap>[0]; nowPlaying?: string | undefined; onPlay: (queue: MixSong[], index: number) => void; onClose: () => void }) {
  const kicker = { root: "Your capsule", genre: "Genre", sound: "Sound", piece: "Style", pick: "Play next" }[node.kind];
  const pieces = tree.branches.reduce((n, b) => n + b.pieces.length, 0);
  const song = node.song;
  const body: string[] = (() => {
    switch (node.kind) {
      case "root": return [`${count(tree.branches.length, "sound")} and ${count(pieces, "piece")}, built on ${blendName(tree.genres) || "your saves"}.`, "Filler note: a capsule is a short list that does a lot. Every piece here answers to a song you love."];
      case "genre": return node.genre ? [LEXICON[node.genre].why, GENRE_NOTES[node.genre], `Runs through ${count(node.count ?? 0, "sound")} in your capsule.`] : [];
      case "sound": return song ? [`${song.artist}. Dressed ${count(node.count ?? 0, "piece")} in your capsule.`, "Filler note: the song sets the temperature; the pieces follow its tempo."] : ["Pieces saved without a song. Your capsule’s sound chooses their music.", "Filler note: give each one a song and it moves onto its own branch."];
      case "piece": return [node.detail ?? node.label, song ? `Saved from ${song.title} by ${song.artist}.` : "Saved on its own.", PIECE_NOTES[node.label.length % PIECE_NOTES.length]!];
      case "pick": return song ? [`${song.artist}. Shares ${(node.shared ?? []).map(g => LEXICON[g].name.toLowerCase()).join(" and ")} with your capsule.`, "Filler note: play it next and see what in the capsule it wakes up."] : [];
    }
  })();
  const live = song ? nowPlaying === song.caption : false;
  // Leftward from the right half. Vertically it slides by how far down the map its word sits (hanging below a word at
  // the top, sitting above one at the bottom), so it always stays inside the frame.
  const flipX = node.x > 0;
  const down = (node.y - VIEW.y) / VIEW.h;
  // On a narrow screen the map scrolls sideways; bring the whole card into view when it opens.
  const card = useRef<HTMLElement>(null);
  useEffect(() => { card.current?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" }); }, [node.id]);
  return (
    <section ref={card} id={id} className="ls-cap-card" data-flip-x={flipX} style={{ ...pct(node), ["--down" as string]: down.toFixed(3) }} aria-label={`${kicker}: ${node.label}`}>
      <div className="ls-cap-card-head">
        <p className="ls-cap-label">{kicker}</p>
        <Button variant="listenIcon" size="round" className="ls-cap-card-close" aria-label="Close" onClick={onClose}><X aria-hidden /></Button>
      </div>
      <div className="ls-cap-card-main">
        {song && <img src={song.art} alt="" width={56} height={56} />}
        <h3>{node.kind === "piece" ? node.label : node.kind === "genre" && node.genre ? LEXICON[node.genre].name : node.label}</h3>
      </div>
      {body.map(line => <p key={line}>{line}</p>)}
      {song && (node.kind === "sound" || node.kind === "pick") && (
        <Button variant="listenInk" size="bar" data-active={live} onClick={() => onPlay([song], 0)}>
          {live ? <Pause aria-hidden /> : <Play className="fill-current" aria-hidden />}{live ? "Playing on the bar" : "Play it"}
        </Button>
      )}
    </section>
  );
}
