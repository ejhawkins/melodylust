import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getBoardReadPreviews, getStyleBoard } from "@/lib/style-board.functions";
import { BoardReadCard } from "@/components/BoardReadCard";
import { boardMissingReason, spotifyTrackId, type BoardSection } from "@/lib/style-board";
import { StylistBriefPanel } from "@/components/StylistBrief";

export const Route = createFileRoute("/board/$id")({
  loader: async ({ params }) => {
    const board = await getStyleBoard({ data: { id: params.id } });
    if (!board) throw notFound();
    return board;
  },
  /** This is where the app displays the board's author. */
  /** TO DO: Create custom titles for style boards, and descriptions with profile links. */
  /** Decision: Should the board have a special name and explain what it is? */
  head: ({ loaderData: b }) => {
    const title = b ? `${b.title} — a style board by ${b.author} · Melodylust` : "Style board · Melodylust";
    const description = b ? b.note.slice(0, 155) : "A style board shared from Melodylust.";
    const image = b?.items.find(i => i.image)?.image;
    return { meta: [
      { title }, { name: "description", content: description },
      { property: "og:title", content: title }, { property: "og:description", content: description },
      { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary_large_image" },
      ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
    ] };
  },
  /* When the board hits an unexpected error, these HTML elements appear instead. */
  errorComponent: ({ error }) => <main className="ls-board-page grid min-h-screen place-items-center p-6 text-center">
    <div><p>This board couldn't load. Please try again.</p>
      {/* Small print: what went wrong, so a broken board can be told apart from a missing one */}
      <p className="ls-board-diagnosis">{error instanceof Error && error.message ? error.message : "The board lookup failed."}</p></div>
  </main>,
  notFoundComponent: () => <main className="ls-board-page grid min-h-screen place-items-center p-6 text-center">
    {/* The message displays when a board cannot be located within the database */}
    <div><h1 className="ls-board-title">Board not found</h1>
      {/* Small print: why the search came up empty (a cut-off link, or a board that isn't public) */}
      <MissingReason />
      <Link to="/" className="mt-4 inline-block underline">Open the Listening Room</Link></div>
  </main>,
  component: BoardPage,
});

function MissingReason() {
  const { id } = Route.useParams();
  return <p className="ls-board-diagnosis">{boardMissingReason(id)}</p>;
}

const SECTIONS: { id: BoardSection; label: string }[] = [{ id: "fashion", label: "The fashion" }, { id: "music", label: "The music" }, { id: "read", label: "The good reads" }];

function BoardPage() {
  const b = Route.useLoaderData();
  // Share cards for the good reads (thumbnail, site, summary), fetched after the page shows so it never waits on them.
  const hasReads = b.items.some(i => i.section === "read" && i.link);
  const { data: previews } = useQuery({ queryKey: ["board-read-previews", b.id], queryFn: () => getBoardReadPreviews({ data: { id: b.id } }),
    enabled: hasReads, staleTime: 30 * 60 * 1000, retry: false });
  return <main className="ls-board-page min-h-screen px-5 py-10">
    {/* This is the article header for the widget */}
    {/* This is an article HTML element */}
    <article className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-3">
        <p className="ls-board-kicker">Style board · by <Link to="/influencer/$id" params={{ id: b.id }} className="underline">{b.author}</Link></p>
        <h1 className="ls-board-title">{b.title}</h1>
        {/* Style notes from a stylist perspective */}
        {/* TO DO: Add more details to the note to be more specific */}
        <p className="ls-board-note">{b.note}</p>
      </header>
      {/* The stylist brief: the toggle answers (occasion, dress level, colour, silhouette, shoes, season), when given */}
      {b.brief && <StylistBriefPanel brief={b.brief} />}
      {SECTIONS.map(s => {
        const items = b.items.filter(i => i.section === s.id);
        // Style board section titles that can be custom
        return items.length ? <section key={s.id} aria-labelledby={`b-${s.id}`}>
          <h2 id={`b-${s.id}`} className="ls-board-h2">{s.label}</h2>
          {/* Here Spotify widgets are identified and embedded with the music that the user enjoys */}
          <ul className="ls-board-items">{items.map((i, n) => s.id === "music" && spotifyTrackId(i.link) ? <li key={n} className="ls-board-embed"><iframe title={`${i.name} on Spotify`} src={`https://open.spotify.com/embed/track/${spotifyTrackId(i.link)}`} width="100%" height="80" loading="lazy" style={{ border: 0, borderRadius: 12 }} allow="autoplay; clipboard-write; encrypted-media; picture-in-picture" /></li> : s.id === "read" ? <li key={n} className="ls-board-read"><BoardReadCard item={i} preview={previews?.[i.link]} /></li> : <li key={n}>
            {i.image && <img src={i.image} alt={i.name} loading="lazy" width={96} height={96} />}
            {/* Item list that includes the product and/or the music link */}
            <div><p className="ls-board-item-name">{i.name}</p>{i.detail && <p className="ls-board-item-detail">{i.detail}</p>}
              {i.link && <a href={i.link} target="_blank" rel="noopener noreferrer nofollow">{s.id === "music" ? "Listen" : "Shop"}</a>}</div>
          </li>)}</ul>
        </section> : null;
      })}
      {/* Call to action: make your own stylist board, search artists and a variety of products */}
      <Link to="/" className="inline-block rounded-full bg-primary px-5 py-2 font-isidora text-sm text-primary-foreground">Make your own in the Listening Room</Link>
    </article>
  </main>;
}
