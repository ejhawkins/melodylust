import { createFileRoute } from "@tanstack/react-router";
import { MusicianCircles } from "@/components/MusicianCircles";

export const Route = createFileRoute("/circles")({
  component: CirclesPage,
  head: () => ({ meta: [
    { title: "Musician Circles — Melody Lust" },
    { name: "description", content: "Explore the documented circles around musicians: collaborators, producers, bands and scenes. We index influence; we don't declare taste." },
    { property: "og:title", content: "Musician Circles — Melody Lust" },
    { property: "og:description", content: "Explore the documented circles around musicians: collaborators, producers, bands and scenes. We index influence; we don't declare taste." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
});

function CirclesPage() {
  return (
    <main className="circles-page">
      <MusicianCircles variant="page" />
    </main>
  );
}
