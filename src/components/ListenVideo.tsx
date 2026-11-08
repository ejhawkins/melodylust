import { useState } from "react";
import { Play } from "lucide-react";
import { LikeButton } from "@/components/LikeButton";
import { Button } from "@/components/ui/button";
import type { MoodVideo } from "@/components/RecordStack";

/** A "This is a mood" music video, opened from the library into the feed: the sleeve, the film (loaded from youtube-nocookie
 *  only when the reader presses play, as the record stack does) and its credits. On phones it is the only way to the videos,
 *  as the mood section is hidden there. */
export function ListenVideo({ video, onBack }: { video: MoodVideo; onBack: () => void }) {
  const [playing, setPlaying] = useState(false);
  return (
    <section className="ls-board ls-video" aria-labelledby="ls-video-title">
      <div className="ls-board-head">
        <img className="ls-look-art" src={video.cover} alt={`Album cover artwork for ${video.title} by ${video.artist}`} width={160} height={160} />
        <div>
          <p className="ls-kicker">Music video · {video.theme}</p>
          <h1 id="ls-video-title" className="ls-board-title">{video.title}</h1>
          <p className="ls-board-meta">{video.artist} · {video.tags.join(" · ")}</p>
          <div className="ls-look-actions"><LikeButton kind="video" id={video.id} name={`${video.title} by ${video.artist}`} /></div>
        </div>
      </div>

      <div className="ls-look-part">
        <div className="ls-video-frame">
          {playing ? (
            <iframe src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`} title={`${video.artist} — ${video.title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
          ) : (
            <button type="button" className="film-poster" onClick={() => setPlaying(true)} aria-label={`Play ${video.artist} — ${video.title}`}>
              <img src={`https://i.ytimg.com/vi/${video.id}/maxresdefault.jpg`} alt={`Still from ${video.title} by ${video.artist}`} loading="lazy" />
              <span className="film-play"><Play aria-hidden /> PLAY THE FILM</span>
            </button>
          )}
        </div>
        <p className="ls-video-credit">
          <span>{video.credit}{video.creditLink && <> <a className="film-link" href={video.creditLink.href} target="_blank" rel="noreferrer">{video.creditLink.label}</a></>}</span>
          <a className="film-link" href={video.url} target="_blank" rel="noreferrer">Watch on YouTube ↗</a>
        </p>
      </div>

      <Button variant="listenCategory" size="chip" onClick={onBack}>Back to the feed</Button>
    </section>
  );
}
