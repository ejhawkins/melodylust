import { useEffect, useId, useMemo, useRef, useState, type ImgHTMLAttributes, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bookmark, Disc3, GitFork, Heart, Sunrise, PanelLeftClose, PanelLeftOpen, Plus, Shirt, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GenreMark } from "@/components/GenreMark";
import { ListenContents } from "@/components/ListenContents";
import { moodVideos } from "@/components/RecordStack";
import { moodboards } from "@/components/StyleMatrix";
import { stories, type Story } from "@/data/home";
import type { MixSong } from "@/lib/listening-room";
import { blendName, mixGenres, type GenreWeights } from "@/lib/genre-shapes";
import { useLikes } from "@/lib/likes";
import { NAME_MAX, createPlaylist, usePlaylists } from "@/lib/playlists";
import { useWishlist } from "@/lib/wishlist";

const KINDS = ["Playlists", "Moodboards", "Looks", "Videos", "Stories", "Capsule"] as const;
type Kind = typeof KINDS[number];
/** What a block says until the reader adds something to it. Playlists has its New playlist block instead. */
const EMPTY: Record<Exclude<Kind, "Playlists">, string> = {
  Moodboards: "Tap the heart on a moodboard to keep it here.",
  Looks: "Tap the heart on a look to keep it here.",
  Videos: "Tap the heart on a video to keep it here.",
  Stories: "Tap the heart on a story to keep it here.",
  Capsule: "Save a piece to your Want List and it joins your capsule here.",
};
/** `blend` draws the thumbnail as the row's genres in the shape lexicon. `own` marks what the reader added themselves
 *  (a like, a playlist, a saved piece), as opposed to the rows every library starts with. */
type Row = { id: string; kind: Kind; title: string; meta: string; art?: string; focus?: string; round?: boolean; swatch?: string; icon?: ReactNode; blend?: GenreWeights; own?: boolean; act: () => void };
const songCount = (n: number) => (n === 1 ? "1 song" : `${n} songs`);

/** "Your Library", the listening room's left panel, in titled blocks. Playlists: the mix, Runway Songs (its own page) and
 *  the reader's own playlists, with New playlist under them. Looks: the Want List, the style profile and liked looks.
 *  Moodboards, Videos and Stories hold only what the reader has liked (newest first), so it is their own shelf rather
 *  than the whole catalogue, and Capsule holds the pieces saved to the Want List. A block with nothing added yet says how
 *  things get there. It folds down to a rail of
 *  the reader's favourites as thumbnails: everything they have hearted, newest first. */
export function ListenLibrary({ open, onOpenChange, mix, active, nowPlaying, onPlaySong, onPlayListSong, onPlayMix, onPlaylist, onWant, onProfile, onLook, onVideo, onBoard, onRead, onContents, contentsShown, onCapsule, onDay, runwayCard }: {
  /** The latest Runway Note's card, for the contents' Runway Songs chapter. */
  runwayCard?: ReactNode;
  /** The feed already shows the contents spread, so the library skips its own copy. */
  contentsShown?: boolean;
  /** Playlists chosen: the contents spread opens front and center in the feed. */
  onContents?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mix: readonly MixSong[];
  /** The row the feed or Now wearing is showing. */
  active: string;
  nowPlaying?: string | undefined;
  onPlaySong: (index: number) => void;
  onPlayListSong: (id: string, index: number) => void;
  onPlayMix: () => void;
  /** Opens one of the reader's playlists in the feed (a new one opens as soon as it's made). */
  onPlaylist: (id: string) => void;
  onWant: () => void;
  /** Opens the Capsule tree in the feed: sounds, the pieces they dressed and songs to play next. */
  onCapsule: () => void;
  /** Opens Build a day: a one-day playlist from the reader's taste profile. */
  onDay: () => void;
  onProfile: () => void;
  onLook: (index: number) => void;
  onVideo: (index: number) => void;
  onBoard: (id: string) => void;
  onRead: (story: Story) => void;
}) {
  const [kind, setKind] = useState<Kind | null>(null);
  const saved = useWishlist();
  const likes = useLikes();
  const playlists = usePlaylists();
  const blend = useMemo(() => mixGenres(mix), [mix]);
  // Each playlist's own shape, from the genres of the songs in it.
  const blends = useMemo(() => new Map(playlists.map(p => [p.id, mixGenres(p.songs.flatMap(c => mix.filter(s => s.caption === c)))])), [playlists, mix]);
  const navigate = useNavigate();
  const latest = [...saved].reverse().find(item => item.image)?.image;
  const rows: Row[] = [
    { id: "mix", kind: "Playlists", title: "The Autumn Mix", meta: `Playlist · ${songCount(mix.length)}`, blend, act: onPlayMix },
    { id: "runway-songs", kind: "Playlists", title: "Runway Songs", meta: "Playlist · Fashion-show soundtracks", icon: <Disc3 />, act: () => void navigate({ to: "/runway-songs" }) },
    ...playlists.map((p): Row => ({ id: `playlist-${p.id}`, kind: "Playlists", title: p.name, meta: `Your playlist · ${songCount(p.songs.length)}`, blend: blends.get(p.id) ?? {}, own: true, act: () => onPlaylist(p.id) })),
    { id: "want", kind: "Looks", title: "Want List", meta: `Saved pieces and songs · ${saved.length}`, ...(latest ? { art: latest } : {}), act: onWant },
    { id: "profile", kind: "Looks", title: "Style profile", meta: "Curator dossier · Style DNA", icon: <SlidersHorizontal />, act: onProfile },
    { id: "day", kind: "Looks", title: "Build a day", meta: "Playlist · From your taste profile", icon: <Sunrise />, act: onDay },
    // The liked items, newest first. A like whose item is gone (a song left the mix, a story was retired) is skipped.
    ...likes.flatMap(l => likeRow(l)),
    // The capsule: its tree first, then every piece saved to the Want List, newest first. A piece opens the tree too.
    { id: "capsule", kind: "Capsule", title: "The Capsule map", meta: "Sound · Style · Play next", icon: <GitFork />, act: onCapsule },
    ...[...saved].reverse().filter(item => item.kind === "piece").map((item): Row => ({ id: `piece-${item.id}`, kind: "Capsule", title: item.name, meta: item.detail ? `Piece · ${item.detail}` : "Piece", ...(item.image ? { art: item.image } : {}), icon: <Shirt />, own: true, act: onCapsule })),
  ];
  // Folded, the library is the reader's favourites. A playlist, runway or fashion like has no page in the library, so its
  // thumbnail goes to the feed's Your favourites shelf, where it sits.
  const toFavourites = () => document.getElementById("ls-favs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const favourites = likes.flatMap((like): Row[] => {
    const row = likeRow(like);
    if (row.length || like.kind === "look" || like.kind === "video" || like.kind === "board" || like.kind === "story") return row;
    return [{ id: `fav-${like.kind}-${like.key}`, kind: "Looks", title: like.title ?? like.key, meta: like.sub ?? "", ...(like.image ? { art: like.image } : {}), icon: <Heart />, own: true, act: toFavourites }];
  });
  function likeRow(like: (typeof likes)[number]): Row[] {
      if (like.kind === "look") {
        const i = mix.findIndex(song => song.caption === like.key);
        const song = mix[i];
        return song ? [{ id: `look-${i}`, kind: "Looks", title: `The ${song.title} look`, meta: `Look · ${song.artist}`, art: song.art, own: true, act: () => onLook(i) }] : [];
      }
      if (like.kind === "video") {
        const i = moodVideos.findIndex(video => video.id === like.key);
        const video = moodVideos[i];
        return video ? [{ id: `video-${i}`, kind: "Videos", title: video.title, meta: `Video · ${video.artist}`, art: video.cover, own: true, act: () => onVideo(i) }] : [];
      }
      if (like.kind === "board") {
        const board = moodboards.find(b => b.id === like.key);
        return board ? [{ id: `board-${board.id}`, kind: "Moodboards", title: board.title, meta: `Moodboard · ${board.genres.join(", ")}`, ...(board.images[0] ? { art: board.images[0].src, focus: board.images[0].focus } : {}), ...(board.palette[0] ? { swatch: board.palette[0] } : {}), round: true, own: true, act: () => onBoard(board.id) }] : [];
      }
      const story = stories.find(st => String(st.id) === like.key);
      return story ? [{ id: `story-${story.id}`, kind: "Stories", title: story.title, meta: `Story · ${story.category}`, art: story.image, own: true, act: () => onRead(story) }] : [];
  }
  // Every block in the filters' order (or just the one chosen), each under its own title, even before it holds anything.
  const groups = KINDS.filter(k => !kind || k === kind).map(k => ({ kind: k, rows: rows.filter(row => row.kind === k) }));

  const thumb = (row: Row) => row.blend
    ? <GenreMark genres={row.blend} title={`${row.title}: ${blendName(row.blend) || "no songs yet"}, blended into one shape`} className="ls-thumb" />
    : row.art
    ? <PhotoOr swatch={row.swatch} className="ls-thumb" data-round={row.round === true} src={row.art} alt="" width={48} height={48} loading="lazy" style={row.focus ? { objectPosition: row.focus } : undefined} />
    : <span className="ls-thumb ls-thumb-empty" aria-hidden>{row.icon ?? <Bookmark />}</span>;
  const item = (row: Row, rail: boolean) => {
    const body = rail ? thumb(row) : <>{thumb(row)}<span className="ls-row-text"><span className="ls-row-title">{row.title}</span><span className="ls-row-meta">{row.meta}</span></span></>;
    const label = rail ? { "aria-label": row.title, title: row.title } : {};
    return <li key={row.id}><Button variant="listenRow" size="block" className={rail ? "" : "w-full"} data-active={active === row.id} onClick={row.act} {...label}>{body}</Button></li>;
  };

  return (
    <nav className="ls-panel ls-left" data-open={open} aria-label="Your library">
      {open ? <>
        <div className="ls-lib-head">
          <div className="ls-lib-title">
            <Button variant="listenIcon" size="round" aria-label="Collapse your library" title="Collapse your library" onClick={() => onOpenChange(false)}><PanelLeftClose /></Button>
            <h2>The Issue</h2>
            {/* Phones: the Style profile sits beside The Issue, set like the Want List (the top bar's copy is hidden there). */}
            <Button variant="listenSolid" size="bar" className="ls-want-btn ls-style-btn ls-show-sm" aria-expanded={active === "profile"} onClick={onProfile}><span>Style profile</span></Button>
          </div>
          <div className="ls-filters" role="group" aria-label="Filter your library">
            {KINDS.map(k => <Button key={k} variant="listenFilter" size="chip" aria-pressed={kind === k} onClick={() => { if (k === "Playlists" && kind !== k) onContents?.(); setKind(current => (current === k ? null : k)); }}>{k}</Button>)}
          </div>
        </div>
        <div className="ls-scroll">
        {!contentsShown && (!kind || kind === "Playlists") && <ListenContents mix={mix} playlists={playlists} nowPlaying={nowPlaying} onPlayMix={onPlaySong} onPlayList={onPlayListSong}
          onRunway={() => void navigate({ to: "/runway-songs" })} onPlaylist={onPlaylist} footer={<NewPlaylist onCreated={onPlaylist} />} runwayCard={runwayCard} />}
        <ul>
          {groups.filter(group => group.kind !== "Playlists").map(group => (
            <li key={group.kind} className="ls-lib-group">
              <h3 className="ls-lib-kind">{group.kind}</h3>
              {group.rows.length > 0 && <ul>{group.rows.map(row => item(row, false))}</ul>}
              {group.kind !== "Playlists" && !group.rows.some(row => row.own) && <p className="ls-lib-hint">{EMPTY[group.kind]}</p>}
            </li>
          ))}
        </ul>
        </div>
      </> : <>
        <div className="ls-rail-head">
          <Button variant="listenIcon" size="round" aria-label="Expand your library" title="Expand your library" onClick={() => onOpenChange(true)}><PanelLeftOpen /></Button>
          <button type="button" className="ls-rail-label" tabIndex={-1} aria-hidden="true" onClick={() => onOpenChange(true)}>The Issue</button>
          <Button variant="listenSolid" size="bar" className="ls-want-btn ls-style-btn ls-show-sm" aria-expanded={active === "profile"} onClick={onProfile}><span>Style profile</span></Button>
        </div>
        {favourites.length > 0
          ? <ul className="ls-scroll ls-rail" aria-label="Your favorites">{favourites.map(row => item(row, true))}</ul>
          : <p className="ls-rail-empty" title="Tap a heart and your favorites show here"><Heart aria-hidden /><span className="sr-only">Tap a heart and your favorites show here.</span></p>}
      </>}
    </nav>
  );
}

/** The dashed block under the playlists. New playlist opens a name field; the playlist it makes opens in the feed, ready
 *  for songs. Escape or Cancel closes the field again. */
function NewPlaylist({ onCreated }: { onCreated: (id: string) => void }) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const field = useId();
  const close = () => { setNaming(false); setName(""); };
  if (!naming) {
    return <div className="ls-lib-new"><Button variant="listenNew" size="cta" onClick={() => setNaming(true)}><Plus aria-hidden />New playlist</Button></div>;
  }
  return (
    <form className="ls-lib-new ls-lib-new-form" onSubmit={e => { e.preventDefault(); const made = createPlaylist(name); close(); onCreated(made.id); }}>
      <label htmlFor={field} className="ls-lib-new-label">Name your playlist</label>
      <input id={field} className="ls-lib-new-input" value={name} maxLength={NAME_MAX} placeholder="My playlist" autoComplete="off" autoFocus
        onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Escape") close(); }} />
      <div className="ls-lib-new-actions">
        <Button type="submit" variant="listenSolid" size="chip">Create</Button>
        <Button type="button" variant="listenOutline" size="chip" onClick={close}>Cancel</Button>
      </div>
    </form>
  );
}

/** A photo that gives way to a flat swatch when it can't load: the moodboards' photos live on
 *  Lovable's file host, which answers 404 anywhere else. A load that failed before hydration counts too. */
export function PhotoOr({ swatch, alt = "", ...img }: ImgHTMLAttributes<HTMLImageElement> & { swatch?: string | undefined; "data-round"?: boolean }) {
  const ref = useRef<HTMLImageElement>(null);
  const [broken, setBroken] = useState(false);
  useEffect(() => { const el = ref.current; if (el?.complete && el.naturalWidth === 0) setBroken(true); }, []);
  if (broken) return <span className={img.className} data-round={img["data-round"]} style={{ ...img.style, background: swatch }} {...(alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true })} />;
  return <img ref={ref} alt={alt} {...img} onError={() => setBroken(true)} />;
}
