import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

/** "Now wearing", the listening room's right panel: three front-row calls to action, set in WTF Hammer. The runway
 *  report opens the home page's Zine, Runway Radio opens /radio (its card names the first of the room's Runway Songs as
 *  now playing) and the profile opens the Style profile in the feed.
 *  The report link is a full page load on purpose: the home page settles its layout as it loads, and an in-app hop scrolled
 *  to #zine before that and stopped short. The player bar's Now wearing button still opens and closes the panel. */
export function NowWearing({ onProfile, nowPlaying }: { onProfile: () => void; nowPlaying?: { name: string; artist: string } | undefined }) {
  const song = nowPlaying?.name ?? "Runway Radio";
  return (
    <aside className="ls-panel ls-right ls-wear" id="now-wearing" aria-label="Now wearing">
      <p className="ls-wear-kicker">Your front-row pass</p>

      <section className="ls-wear-cta" aria-labelledby="ls-wear-report">
        <span className="ls-wear-num">01 · The runway report</span>
        <h2 id="ls-wear-report" className="ls-wear-title">Hear what played. <em>Thom Browne <span className="ls-wear-xxx">F/W 2017</span></em></h2>
        <p className="ls-wear-copy">The season's shows, read for the sound behind the clothes. A zine worth keeping.</p>
        <Button asChild variant="listenSolid" size="bar"><a href="/#zine"><span className="ls-wear-btn-hammer">Read <span className="ls-wear-xxx">the</span> report</span></a></Button>
      </section>

      <section className="ls-wear-cta" aria-labelledby="ls-wear-radio">
        <span className="ls-wear-num">02 · Runway Radio</span>
        <h2 id="ls-wear-radio" className="ls-wear-title">Tune in. <em className="ls-wear-now" title={nowPlaying ? `${nowPlaying.name} by ${nowPlaying.artist}` : undefined}><span className="ls-wear-xxx">Now playing:</span>{" "}
          {/* The song runs past as a ticker: two copies, the second a hidden repeat, so the loop has no seam. */}
          <span className="ls-wear-song" style={{ "--ticker-chars": song.length } as CSSProperties}>
            <span className="ls-wear-ticker"><span className="ls-wear-tick">{song}</span><span className="ls-wear-tick" aria-hidden="true">{song}</span></span>
          </span>
        </em></h2>
        <p className="ls-wear-copy">Stations from Mod to Grunge, each one playing in the uniform its scene wore.</p>
        <Button asChild variant="listenBlack" size="bar"><Link to="/radio"><span className="ls-wear-btn-hammer">Listen <span className="ls-wear-xxx">to</span> Runway Radio</span></Link></Button>
      </section>

      <section className="ls-wear-cta" aria-labelledby="ls-wear-profile">
        <span className="ls-wear-num">03 · Your style profile</span>
        <h2 id="ls-wear-profile" className="ls-wear-title">Your sound. <em>Your cut.</em> <span className="ls-wear-line">&amp; your <span className="ls-wear-xxx">Editor’s Picks.</span></span></h2>
        <p className="ls-wear-copy">Tell us what you play and what you wear. The looks come back cut to you.</p>
        <Button variant="listenBlack" size="bar" onClick={onProfile}><span className="ls-wear-btn-hammer">Build <span className="ls-wear-xxx">my</span> profile</span></Button>
      </section>
    </aside>
  );
}
