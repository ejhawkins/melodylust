import { createFileRoute } from '@tanstack/react-router';
import { RunwaySongs } from '@/components/RunwaySongs';
import { getRunwayArchive } from '@/lib/runway-archive.functions';

export const Route = createFileRoute('/runway-songs')({
  head: () => ({
    meta: [
      { title: 'Runway Songs — Runway Music Archive' },
      { name: 'description', content: 'Play the sourced soundtracks from Balenciaga, Prada, Celine and Loewe shows, one runway at a time.' },
    ],
  }),
  loader: () => getRunwayArchive(),
  component: RunwaySongsPage,
});

function RunwaySongsPage() {
  return <RunwaySongs archive={Route.useLoaderData().songs} />;
}
