import { useEffect, useId, useMemo, useRef, useState, type ImgHTMLAttributes, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bookmark, Disc3, PanelLeftClose, PanelLeftOpen, Plus, Shirt, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GenreMark } from "@/components/GenreMark";
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
 *  things get there. It folds down to a rail of thumbnails. */
export function ListenLibrary({ open, onOpenChange, mix, active, onPlayMix, onPlaylist, onWant, onProfile, onLook, onVideo, onBoard, onRead }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mix: readonly MixSong[];
  /** The row the feed or Now wearing is showing. */
  active: string;
  onPlayMix: () => void;
  /** Opens one of the reader's playlists in the feed (a new one opens as soon as it's made). */
  onPlaylist: (id: string) => void;
  onWant: () => void;
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
    // The liked items, newest first. A like whose item is gone (a song left the mix, a story was retired) is skipped.
    ...likes.flatMap((like): Row[] => {
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
    }),
    // The capsule: every piece saved to the Want List, newest first. They live on the Want List, so a row opens it.
    ...[...saved].reverse().filter(item => item.kind === "piece").map((item): Row => ({ id: `piece-${item.id}`, kind: "Capsule", title: item.name, meta: item.detail ? `Piece · ${item.detail}` : "Piece", ...(item.image ? { art: item.image } : {}), icon: <Shirt />, own: true, act: onWant })),
  ];
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
            <h2>Your Library</h2>
          </div>
          <div className="ls-filters" role="group" aria-label="Filter your library">
            {KINDS.map(k => <Button key={k} variant="listenFilter" size="chip" aria-pressed={kind === k} onClick={() => setKind(current => (current === k ? null : k))}>{k}</Button>)}
          </div>
        </div>
        <ul className="ls-scroll">
          {groups.map(group => (
            <li key={group.kind} className="ls-lib-group">
              <h3 className="ls-lib-kind">{group.kind}</h3>
              {group.rows.length > 0 && <ul>{group.rows.map(row => item(row, false))}</ul>}
              {group.kind === "Playlists"
                ? <NewPlaylist onCreated={onPlaylist} />
                : !group.rows.some(row => row.own) && <p className="ls-lib-hint">{EMPTY[group.kind]}</p>}
            </li>
          ))}
        </ul>
      </> : <>
        <div className="ls-rail-head">
          <Button variant="listenIcon" size="round" aria-label="Expand your library" title="Expand your library" onClick={() => onOpenChange(true)}><PanelLeftOpen /></Button>
        </div>
        <ul className="ls-scroll ls-rail">{groups.flatMap(group => group.rows).map(row => item(row, true))}</ul>
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
