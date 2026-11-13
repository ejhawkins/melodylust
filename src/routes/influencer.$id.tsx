import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getInfluencerBoards } from "@/lib/style-board.functions";
import { spotifyTrackId } from "@/lib/style-board";
import { FollowButton } from "@/components/FollowButton";

export const Route = createFileRoute("/influencer/$id")({
  loader: async ({ params }) => {
    const page = await getInfluencerBoards({ data: { id: params.id } });
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData: p }) => {
    const title = p ? `${p.author} — Style Influencer · Melodylust` : "Style Influencer · Melodylust";
    const description = p ? `${p.boards.length} style board${p.boards.length === 1 ? "" : "s"} by ${p.author}: outfits, the songs they're worn to, and good reads.` : "A Melodylust Style Influencer.";
    const image = p?.boards.flatMap(b => b.items).find(i => i.image)?.image;
    return { meta: [
      { title }, { name: "description", content: description },
      { property: "og:title", content: title }, { property: "og:description", content: description },
      { property: "og:type", content: "profile" }, { name: "twitter:card", content: "summary_large_image" },
      ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
    ] };
  },
  errorComponent: () => <main className="ls-board-page grid min-h-screen place-items-center p-6 text-center"><p>This page couldn't load. Please try again.</p></main>,
  notFoundComponent: () => <main className="ls-board-page grid min-h-screen place-items-center p-6 text-center">
    <div><h1 className="ls-board-title">Influencer not found</h1><Link to="/" className="mt-4 inline-block underline">Open the Listening Room</Link></div>
  </main>,
  component: InfluencerPage,
});

function InfluencerPage() {
  const { author, boards } = Route.useLoaderData();
  const items = boards.flatMap(b => b.items.map(i => ({ ...i, board: b })));
  const photos = items.filter(i => i.section === "fashion" && i.image);
  const music = items.filter(i => i.section === "music");
  const reads = items.filter(i => i.section === "read");
  return <main className="ls-board-page ls-inf min-h-screen px-5 py-10">
    <article className="mx-auto max-w-3xl space-y-10">
      <header className="space-y-3">
        <p className="ls-board-kicker">Style Influencer</p>
        <h1 className="ls-board-title">{author}</h1>
        <div className="flex gap-3 items-center"><FollowButton id={Route.useParams().id} author={author} /><Link to="/influencers" className="underline text-sm">All stylists</Link></div>
        <p className="ls-board-note">{boards.length} board{boards.length === 1 ? "" : "s"} · {photos.length} looks · {music.length} songs · {reads.length} reads</p>
      </header>
      {photos.length > 0 && <section aria-labelledby="inf-photos"><h2 id="inf-photos" className="ls-board-h2">The fashion</h2>
        <ul className="ls-inf-photos">{photos.map((i, n) => <li key={n}>
          <img src={i.image!} alt={i.name} loading={n < 4 ? "eager" : "lazy"} width={400} height={500} />
          <p className="ls-board-item-name">{i.name}</p>
          {i.link && <a href={i.link} target="_blank" rel="noopener noreferrer nofollow">Shop</a>}
        </li>)}</ul></section>}
      {music.length > 0 && <section aria-labelledby="inf-music"><h2 id="inf-music" className="ls-board-h2">The music</h2>
        <ul className="ls-inf-music">{music.map((i, n) => { const t = spotifyTrackId(i.link); return <li key={n}>
          {t ? <iframe title={`${i.name} on Spotify`} src={`https://open.spotify.com/embed/track/${t}`} width="100%" height="80" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture" />
            : <p><span className="ls-board-item-name">{i.name}</span>{i.detail ? ` — ${i.detail}` : ""} {i.link && <a href={i.link} target="_blank" rel="noopener noreferrer nofollow">Listen</a>}</p>}
        </li>; })}</ul></section>}
      {reads.length > 0 && <section aria-labelledby="inf-reads"><h2 id="inf-reads" className="ls-board-h2">Good reads</h2>
        <ul className="ls-board-items">{reads.map((i, n) => <li key={n}>
          {i.image && <img src={i.image} alt="" loading="lazy" width={96} height={96} />}
          <div><p className="ls-board-item-name">{i.name}</p>{i.detail && <p className="ls-board-item-detail">{i.detail}</p>}
            {i.link && <a href={i.link} target="_blank" rel="noopener noreferrer nofollow">Read</a>}</div>
        </li>)}</ul></section>}
      <section aria-labelledby="inf-boards"><h2 id="inf-boards" className="ls-board-h2">Boards</h2>
        <ul className="ls-inf-boards">{boards.map(b => <li key={b.id}><Link to="/board/$id" params={{ id: b.id }}>{b.title}</Link><p>{b.note.slice(0, 140)}</p></li>)}</ul></section>
      <Link to="/" className="inline-block rounded-full bg-primary px-5 py-2 font-isidora text-sm text-primary-foreground">Make your own in the Listening Room</Link>
    </article>
  </main>;
}
