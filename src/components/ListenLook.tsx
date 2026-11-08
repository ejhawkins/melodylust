import { Check, Play, Plus } from "lucide-react";
import { LikeButton } from "@/components/LikeButton";
import { Button } from "@/components/ui/button";
import { iconicSongs, moodPool, songLooks, type Look } from "@/data/home";
import { findWish, type MixSong } from "@/lib/listening-room";
import { addWish, removeWish, useWishlist } from "@/lib/wishlist";

/** A song's look, opened from the library into the feed: the three pieces that dress the track,
 *  saved to the same Want List as the home page's shop sheet. Browsing it leaves the music alone. */
export function ListenLook({ song, onPlay, onWantList, onBack }: { song: MixSong; onPlay: () => void; onWantList: () => void; onBack: () => void }) {
  const items = useWishlist();
  const looks = songLooks[song.caption] ?? [];
  const songWish = findWish(items, "song", song.caption);
  const pieceWish = (name: string) => findWish(items, "piece", name, song.caption);
  const lookSaved = Boolean(songWish) && looks.every(l => pieceWish(l.name));
  // The same photos the home page's shop sheet styles this song against.
  const k = Math.max(0, iconicSongs.findIndex(s => s.caption === song.caption));
  const moods = [0, 1, 2].map(j => moodPool[(k * 2 + j) % moodPool.length]);
  const savePiece = (l: Look) => addWish({ kind: "piece", name: l.name, detail: l.price, link: "", note: "", from: song.caption });
  const saveLook = () => {
    looks.filter(l => !pieceWish(l.name)).forEach(savePiece);
    if (!songWish) addWish({ kind: "song", name: song.caption, detail: "", link: song.link, note: "" });
  };

  return (
    <section className="ls-board" aria-labelledby="ls-look-title">
      <div className="ls-board-head">
        <img className="ls-look-art" src={song.art} alt={song.alt} width={160} height={160} />
        <div>
          <p className="ls-kicker">The look</p>
          <h1 id="ls-look-title" className="ls-board-title">The {song.title} look</h1>
          <p className="ls-board-meta">{song.artist} · Three pieces that dress the track.</p>
          <div className="ls-look-actions">
            <Button variant="listenInk" size="bar" onClick={onPlay}><Play className="fill-current" aria-hidden />Play the song</Button>
            {lookSaved
              ? <Button variant="listenSave" size="bar" onClick={onWantList}>Look saved · Open your Want List</Button>
              : <Button variant="listenSave" size="bar" onClick={saveLook}>Save the look to your Want List</Button>}
            <LikeButton kind="look" id={song.caption} name={`The ${song.title} look`} />
          </div>
        </div>
      </div>

      <div className="ls-look-part">
        <div className="ls-section-head"><h2>+ The pieces</h2></div>
        <ul className="ls-pieces">
          {looks.map(l => {
            const saved = pieceWish(l.name);
            return <li key={l.name}>
              <span className="ls-piece-text"><span className="ls-piece-name">{l.name}</span><span className="ls-piece-note">{l.note}</span></span>
              <span className="ls-piece-price">{l.price}</span>
              <Button variant="listenSave" size="round" aria-pressed={Boolean(saved)} aria-label={saved ? `Remove ${l.name} from your Want List` : `Save ${l.name} to your Want List`}
                onClick={() => (saved ? removeWish(saved.id) : savePiece(l))}>{saved ? <Check /> : <Plus />}</Button>
            </li>;
          })}
        </ul>
      </div>

      <div className="ls-look-part">
        <div className="ls-section-head"><h2>+ Moodboard</h2></div>
        <ul className="ls-look-moods">{moods.map((src, j) => src && <li key={j}><img src={src} alt="" width={300} height={400} loading="lazy" /></li>)}</ul>
      </div>

      <Button variant="listenCategory" size="chip" onClick={onBack}>Back to the feed</Button>
    </section>
  );
}
