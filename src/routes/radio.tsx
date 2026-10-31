import { createFileRoute } from '@tanstack/react-router';
import { Radio } from '@/components/Radio';

export const Route = createFileRoute('/radio')({
  head: () => ({
    meta: [
      { title: 'Radio — Runway Music Archive' },
      { name: 'description', content: 'Subculture stations from Mod to Grunge, each with the uniform its scene wore.' },
    ],
  }),
  component: Radio,
});
