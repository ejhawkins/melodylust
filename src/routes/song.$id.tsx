import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getSpotifyTrack } from "@/lib/spotify-track.functions";

export const Route = createFileRoute("/song/$id")({
  loader: async ({ params }) => {
    if (!/^[A-Za-z0-9]{22}$/.test(params.id)) throw notFound();
    const track = await getSpotifyTrack({ data: { id: params.id } });
    if (!track) throw notFound();
    return track;
  },
  head: ({ loaderData: t }) => {
    const title = t ? `${t.title} — ${t.artist} · Melodylust` : "Shared song · Melodylust";
    const description = t ? `Listen to ${t.title} by ${t.artist}, shared from the Melodylust Studio.` : "A song shared from the Melodylust Studio.";
    return { meta: [
      { title }, { name: "description", content: description },
      { property: "og:title", content: title }, { property: "og:description", content: description },
      { property: "og:type", content: "music.song" }, { name: "twitter:card", content: "summary_large_image" },
      ...(t?.art ? [{ property: "og:image", content: t.art }, { name: "twitter:image", content: t.art }] : []),
    ] };
  },
  notFoundComponent: () => (
    <main className="ls-song-page grid min-h-screen place-items-center p-6 text-center">
      <div><h1 className="ls-studio-title">Song not found</h1><Link to="/" className="mt-4 inline-block text-primary underline">Open the Listening Room</Link></div>
    </main>
  ),
  component: SongPage,
});

function SongPage() {
  const t = Route.useLoaderData();
  return (
    <main className="ls-song-page min-h-screen px-5 py-10">
      <div className="mx-auto max-w-md space-y-5">
        <p className="ls-studio-sub">Now playing, shared from the Studio</p>
        {t.art && <img src={t.art} alt={`${t.title} cover`} className="aspect-square w-full rounded-3xl object-cover shadow-2xl" />}
        <div><h1 className="ls-studio-title break-words">{t.title}</h1><p className="mt-1 text-lg text-muted-foreground">{t.artist}</p></div>
        <iframe title={`${t.title} on Spotify`} src={`https://open.spotify.com/embed/track/${t.id}?utm_source=generator&theme=0`} width="100%" height="152" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" className="block rounded-xl border-0" />
        <div className="flex flex-wrap gap-2">
          <a href={t.url} target="_blank" rel="noopener noreferrer" className="rounded-full bg-primary px-5 py-2 font-isidora text-sm text-primary-foreground">Open in Spotify</a>
          <Link to="/" className="rounded-full bg-secondary px-5 py-2 font-isidora text-sm text-secondary-foreground">Explore the Listening Room</Link>
        </div>
      </div>
    </main>
  );
}
