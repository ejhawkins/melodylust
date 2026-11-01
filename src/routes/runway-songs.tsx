import { createFileRoute } from '@tanstack/react-router';
import { RunwaySongs } from '@/components/RunwaySongs';
import { getRunwayArchive } from '@/lib/runway-archive.functions';
import { getDesignerRadio } from '@/lib/designer-radio.functions';
import { getShowNotes } from '@/lib/show-notes.functions';

export const Route = createFileRoute('/runway-songs')({
  head: () => ({
    meta: [
      { title: 'Runway Songs' },
      { name: 'description', content: 'Play sourced fashion-show soundtracks and newly approved designer discoveries, one runway at a time.' },
    ],
  }),
  loader: async () => {
    const [archive, designerRadio, showNotes] = await Promise.all([getRunwayArchive(), getDesignerRadio(), getShowNotes()]);
    return {
      songs: [...archive.songs, ...designerRadio.songs],
      showNotes,
      connected: archive.connected || designerRadio.connected,
    };
  },
  component: RunwaySongsPage,
});

function RunwaySongsPage() {
  const { songs, showNotes } = Route.useLoaderData();
  return <RunwaySongs archive={songs} showNotes={showNotes} />;
}
