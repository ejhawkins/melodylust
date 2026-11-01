import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chartDateLabel, chartDeck, chartNotes, chartWeek, indexNotes, leadLabel, listenLink, movement, inWords, type ChartEntry } from "@/lib/billboard";
import { getHot100 } from "@/lib/billboard.functions";

export const hot100QueryOptions = queryOptions({
  queryKey: ["billboard-hot-100"],
  queryFn: () => getHot100(),
  staleTime: 60 * 60 * 1000,
});

/** Text set as three misregistered process plates over the paper (the Broadsheet print grammar). */
function Plates({ text, className }: { text: string; className: string }) {
  return (
    <span className={className}>
      <span className="bb-paper">{text}</span>
      <span className="bb-plate bb-plate-c" aria-hidden="true">{text}</span>
      <span className="bb-plate bb-plate-m" aria-hidden="true">{text}</span>
      <span className="bb-plate bb-plate-y" aria-hidden="true">{text}</span>
    </span>
  );
}

/** The four-plate separation, as one SVG filter the cover photograph is printed through. */
function PlateFilter() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <filter id="bb-sep-all" colorInterpolationFilters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0.467 0 0 0 0.533  0.310 0 0 0 0.690  0 0 0 0 1" result="c0" />
          <feComposite in="c0" in2="SourceAlpha" operator="in" result="c" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0.161 0 0 0.839  0 1 0 0 0  0 0.576 0 0 0.424  0 0 0 0 1" result="m0" />
          <feComposite in="m0" in2="SourceAlpha" operator="in" result="m1" />
          <feOffset in="m1" dx="5" dy="3" result="m" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0.071 0 0.929  0 0 0.267 0 0.733  0 0 1 0 0  0 0 0 0 1" result="y0" />
          <feComposite in="y0" in2="SourceAlpha" operator="in" result="y1" />
          <feOffset in="y1" dx="-5" dy="-3" result="y" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0.112 0.375 0.038 0 0.475  0.113 0.379 0.038 0 0.471  0.113 0.380 0.038 0 0.468  0 0 0 0 1" result="k0" />
          <feComposite in="k0" in2="SourceAlpha" operator="in" result="k1" />
          <feOffset in="k1" dx="3" dy="6" result="k" />
          <feBlend in="m" in2="c" mode="multiply" result="s1" />
          <feBlend in="y" in2="s1" mode="multiply" result="s2" />
          <feBlend in="k" in2="s2" mode="multiply" />
        </filter>
      </defs>
    </svg>
  );
}

const Move = ({ entry }: { entry: ChartEntry }) => {
  const m = movement(entry);
  return <span className="bb-move" data-move={m.kind}>{m.label}</span>;
};

/**
 * The week's twenty: the Billboard Hot 100 top twenty set as a broadsheet front page, after
 * the Melodylust Playlist design. Live each week from the open Hot 100 dataset; every song
 * opens in Spotify. The section stays out of the page when the chart can't be reached.
 */
export function BillboardBroadsheet() {
  const { data: feed } = useSuspenseQuery(hot100QueryOptions);
  if (!feed) return null;
  const { chart, cover } = feed;
  const twenty = chart.entries.filter((e) => e.pos <= 20);
  const lead = twenty[0];
  if (!lead) return null;
  const rest = twenty.slice(1);
  const notes = chartNotes(chart.entries);
  const lines = indexNotes(rest);
  const date = chartDateLabel(chart.date);
  const count = inWords(twenty.length).replace(/^./, (c) => c.toUpperCase());

  return (
    <section className="bb" id="the-twenty" aria-labelledby="bb-title">
      <PlateFilter />
      <header className="bb-head">
        <span className="bb-kicker">Chart week of {date}</span>
        <h2 id="bb-title" className="bb-title">
          <Plates className="bb-plates" text={`${count} songs the country won’t turn off.`} />
        </h2>
        <p className="bb-deck">{chartDeck(chart.entries)}</p>
      </header>

      <div className="bb-edition">
        <span>Vol. 01 · No. {chartWeek(chart.date)}</span>
        <span>{count} tracks</span>
        <span>After the Billboard Hot 100</span>
        <span>Turned over every Tuesday</span>
      </div>

      <article className="bb-lead" aria-labelledby="bb-lead-title">
        {cover && (
          <figure className="bb-cover">
            <a href={cover.link} target="_blank" rel="noreferrer" aria-label={`${lead.title} by ${lead.artist} on Apple Music`}>
              <span className="bb-print"><img src={cover.image} alt={`Cover art for ${lead.title} by ${lead.artist}`} width={600} height={600} loading="lazy" /></span>
            </a>
            <figcaption>Artwork via Apple Music</figcaption>
          </figure>
        )}
        <div className="bb-lead-copy">
          <div className="bb-lead-mark">
            <Plates className="bb-num bb-num-lead" text="1" />
            <span className="bb-label">{leadLabel(lead)}</span>
          </div>
          <h3 id="bb-lead-title" className="bb-lead-title">{lead.title}</h3>
          <p className="bb-lead-artist">{lead.artist}</p>
          <dl className="bb-stats">
            <div><dt>Last week</dt><dd>{lead.lastWeek ?? "—"}</dd></div>
            <div><dt>Peak</dt><dd>{lead.peak}</dd></div>
            <div><dt>Weeks</dt><dd>{lead.weeks}</dd></div>
          </dl>
          <Button asChild variant="broadsheet" className="bb-listen h-auto px-[18px] py-2.5">
            <a href={listenLink(lead)} target="_blank" rel="noreferrer"><Play aria-hidden="true" /> Listen on Spotify</a>
          </Button>
        </div>
      </article>

      <div className="bb-body">
        <section className="bb-index" aria-labelledby="bb-rest">
          <span id="bb-rest" className="bb-kicker">The rest of the twenty</span>
          <ol className="bb-rows">
            {rest.map((e) => (
              <li key={e.pos} className="bb-row">
                <span className="bb-row-pos" aria-label={`No. ${e.pos}`}>{e.pos}</span>
                <div className="bb-row-song">
                  <span className="bb-row-title">{e.title}</span>
                  <span className="bb-row-artist">{e.artist}</span>
                  {lines.get(e.pos) && <span className="bb-row-note">{lines.get(e.pos)}</span>}
                </div>
                <div className="bb-row-meta"><Move entry={e} /><span>{e.weeks} wks</span></div>
                <a className="bb-row-listen" href={listenLink(e)} target="_blank" rel="noreferrer" aria-label={`Listen to ${e.title} by ${e.artist} on Spotify`}>
                  <Play aria-hidden="true" />
                </a>
              </li>
            ))}
          </ol>
        </section>

        {notes.length > 0 && (
          <aside className="bb-notes" aria-labelledby="bb-notes-title">
            <span id="bb-notes-title" className="bb-kicker">Notes from the chart</span>
            {notes.map((n) => (
              <div key={n.title} className="bb-note">
                {n.figure && <Plates className="bb-num bb-num-note" text={String(n.figure)} />}
                <h3>{n.title}</h3>
                <p>{n.body}</p>
              </div>
            ))}
          </aside>
        )}
      </div>

      <footer className="bb-foot">
        Chart positions from the <a href="https://www.billboard.com/charts/hot-100/" target="_blank" rel="noreferrer">Billboard Hot 100</a> dated {date}. Last week, peak and weeks on chart as published.
      </footer>
    </section>
  );
}
