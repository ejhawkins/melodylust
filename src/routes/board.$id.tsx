import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getStyleBoard } from "@/lib/style-board.functions";
import type { BoardSection } from "@/lib/style-board";

export const Route = createFileRoute("/board/$id")({
  loader: async ({ params }) => {
    const board = await getStyleBoard({ data: { id: params.id } });
    if (!board) throw notFound();
    return board;
  },
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
  notFoundComponent: () => <main className="ls-board-page grid min-h-screen place-items-center p-6 text-center">
    <div><h1 className="ls-board-title">Board not found</h1><Link to="/" className="mt-4 inline-block underline">Open the Listening Room</Link></div>
  </main>,
  component: BoardPage,
});

const SECTIONS: { id: BoardSection; label: string }[] = [{ id: "fashion", label: "The fashion" }, { id: "music", label: "The music" }, { id: "read", label: "Good reads" }];

function BoardPage() {
  const b = Route.useLoaderData();
  return <main className="ls-board-page min-h-screen px-5 py-10">
    <article className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-3">
        <p className="ls-board-kicker">Style board · by {b.author}</p>
        <h1 className="ls-board-title">{b.title}</h1>
        <p className="ls-board-note">{b.note}</p>
      </header>
      {SECTIONS.map(s => {
        const items = b.items.filter(i => i.section === s.id);
        return items.length ? <section key={s.id} aria-labelledby={`b-${s.id}`}>
          <h2 id={`b-${s.id}`} className="ls-board-h2">{s.label}</h2>
          <ul className="ls-board-items">{items.map((i, n) => <li key={n}>
            {i.image && <img src={i.image} alt={i.name} loading="lazy" width={96} height={96} />}
            <div><p className="ls-board-item-name">{i.name}</p>{i.detail && <p className="ls-board-item-detail">{i.detail}</p>}
              {i.link && <a href={i.link} target="_blank" rel="noopener noreferrer nofollow">{s.id === "music" ? "Listen" : s.id === "read" ? "Read" : "Shop"}</a>}</div>
          </li>)}</ul>
        </section> : null;
      })}
      <Link to="/" className="inline-block rounded-full bg-primary px-5 py-2 font-isidora text-sm text-primary-foreground">Make your own in the Listening Room</Link>
    </article>
  </main>;
}
