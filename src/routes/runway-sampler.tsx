import { createFileRoute } from '@tanstack/react-router';
import { RunwaySampler } from '@/components/RunwaySampler';

export const Route = createFileRoute('/runway-sampler')({
  head: () => ({
    meta: [
      { title: 'Runway Sound Sampler — Melody Lust' },
      { name: 'description', content: 'Sourced runway soundtracks from Balenciaga, Prada, Celine and Loewe, sorted by catwalk energy.' },
    ],
  }),
  component: RunwaySampler,
});
