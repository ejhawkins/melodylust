import { createFileRoute } from '@tanstack/react-router';
import { Radio } from '@/components/Radio';

export const Route = createFileRoute('/radio')({
  head: () => ({
    meta: [
      { title: 'Radio — Runway Songs' },
      { name: 'description', content: 'Subculture stations from Mod to Grunge, each with the uniform its scene wore.' },
      { property: 'og:title', content: 'Radio — Runway Songs' },
      { property: 'og:description', content: 'Subculture stations from Mod to Grunge, each with the uniform its scene wore.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: Radio,
});
