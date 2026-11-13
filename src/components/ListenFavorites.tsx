import { Heart } from "lucide-react";
import { LikeButton } from "@/components/LikeButton";
import { stories, type Story } from "@/data/home";
import { useLikes, type LikeKind } from "@/lib/likes";

const LABEL: Record<LikeKind, string> = { look: "Song", video: "Video", board: "Moodboard", story: "Story", playlist: "Playlist", runway: "Runway", fashion: "Fashion" };

/** Every hearted item on the home page in one story-style shelf; stored on this device with the rest of the likes. */
export function ListenFavorites({ onStory }: { onStory: (s: Story) => void }) {
  const likes = useLikes();
  const rows = likes.map(l => {
    const story = l.kind === "story" ? stories.find(s => String(s.id) === l.key) : undefined;
    return { ...l, title: l.title ?? story?.title ?? l.key, sub: l.sub ?? (story ? `${story.category} · ${story.date}` : ""), image: l.image ?? story?.image, story };
  });
  return (
    <section className="ls-section" aria-labelledby="ls-favs">
      <div className="ls-section-head"><h2 id="ls-favs"><em className="ls-favs-your">Your</em> Favorites</h2><span>{rows.length ? `${rows.length} saved` : "Tap a heart to add it here"}</span></div>
      {rows.length === 0 ? <p className="ls-empty"><Heart className="mr-1 inline size-4" aria-hidden />Heart songs, playlists, stories, looks, products and runway moments, and they gather here.</p> : (
        <ul className="ls-notes">
          {rows.map(r => <li key={`${r.kind}-${r.key}`}>
            <div className="ls-note ls-fav w-full" role={r.story ? "button" : undefined} tabIndex={r.story ? 0 : undefined}
              onClick={r.story ? () => onStory(r.story!) : undefined} onKeyDown={r.story ? e => { if (e.key === "Enter") onStory(r.story!); } : undefined}>
              {r.image ? <img src={r.image} alt="" width={400} height={500} loading="lazy" /> : <span className="ls-fav-blank" aria-hidden><Heart /></span>}
              <span className="ls-note-kicker">{LABEL[r.kind]}{r.sub ? ` · ${r.sub}` : ""}</span>
              <span className="ls-note-title">{r.title}</span>
            </div>
            <LikeButton look="quick" kind={r.kind} id={r.key} name={r.title} className="ls-quick-like" />
          </li>)}
        </ul>
      )}
    </section>
  );
}
