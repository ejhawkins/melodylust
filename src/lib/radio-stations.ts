// Radio: Melody Lust without the runway. Each station is a scene (one sound, one city, one year)
// and the uniform it put on the street long before anyone sold it back.

export type RadioStation = {
  name: string;
  place: string;
  uniform: string[];
  /** What the station stands for, in a sentence or two. */
  manifesto?: string;
  /** The curator's note: how to listen, or what to notice. */
  note?: string;
  /** Records from the scene and its years, as released. */
  tracks?: { title: string; artist: string; year: number }[];
};

export const RADIO_STATIONS: RadioStation[] = [
  { name: 'Mod', place: 'London ’64', uniform: ['Fishtail parka', 'Slim mohair suit', 'Button-down shirt', 'Knit polo shirt', 'Desert boots'] },
  { name: 'Northern Soul', place: 'Wigan ’73', uniform: ['High-waisted baggies', 'Bowling shirt', 'Sleeveless vest', 'Sew-on club patches', 'Leather-soled shoes'] },
  { name: 'Punk', place: 'London ’77', uniform: ['Leather biker jacket', 'Safety pins', 'Bondage trousers', 'Torn T-shirt', 'Oxblood boots'] },
  {
    name: 'Post-Punk', place: 'Manchester ’79', uniform: ['Grey overcoat', 'Shirt buttoned to the collar', 'Pleated trousers', 'Narrow tie', 'Black Derby shoes'],
    manifesto: 'Punk tore the clothes up; this station ironed them. Office shirts, charity-shop overcoats and bass lines with nowhere to sit down.',
    note: 'Listen for the space. The bass carries the tune, the guitar only comments, and the drums sound like a room with the heating off.',
    tracks: [{ title: 'Transmission', artist: 'Joy Division', year: 1979 }, { title: 'Shot by Both Sides', artist: 'Magazine', year: 1978 }, { title: 'Rowche Rumble', artist: 'The Fall', year: 1979 }],
  },
  { name: 'Two Tone', place: 'Coventry ’79', uniform: ['Pork pie hat', 'Tonic suit', 'Harrington jacket', 'Black-and-white checks', 'Loafers'] },
  { name: 'Acid House', place: 'London ’88', uniform: ['Smiley-face T-shirt', 'Baggy dungarees', 'Bandana', 'Oversized hoodie', 'Trainers'] },
  { name: 'Grunge', place: 'Seattle ’91', uniform: ['Flannel shirt', 'Thermal under a tee', 'Ripped jeans', 'Oversized cardigan', 'Combat boots'] },
  {
    name: 'Techno', place: 'Berlin ’92', uniform: ['Bomber jacket', 'Camouflage trousers', 'Mesh vest', 'Cropped tank', 'Heavy boots'],
    manifesto: 'A bank vault, a strobe and a wall that had just come down. The clothes are whatever survives twelve hours in the dark.',
    note: 'Play it louder than is polite. These records were cut for one room, and they only make sense at its volume.',
    tracks: [{ title: 'Der Klang der Familie', artist: '3 Phase feat. Dr. Motte', year: 1992 }, { title: 'Sonic Destroyer', artist: 'X-101', year: 1991 }, { title: 'Energy Flash', artist: 'Joey Beltram', year: 1990 }],
  },
  {
    name: 'Jungle', place: 'London ’94', uniform: ['Printed designer jeans', 'Camouflage combats', 'Flight jacket', 'Gold chain', 'Classic trainers'],
    manifesto: 'Breakbeats at double speed, bass at half. Pirate radio dressed for the rave in its loudest labels and its cleanest trainers.',
    note: 'Follow the bass line, not the drums. The drums are the weather; the bass is where you stand.',
    tracks: [{ title: 'Original Nuttah', artist: 'UK Apachi & Shy FX', year: 1994 }, { title: 'Incredible', artist: 'M-Beat feat. General Levy', year: 1994 }, { title: 'Renegade Snares', artist: 'Omni Trio', year: 1993 }],
  },
  {
    name: 'Grime', place: 'London ’03', uniform: ['Matching tracksuit', 'Fitted cap', 'Box-fresh trainers', 'Hooded sweatshirt', 'Puffer jacket'],
    manifesto: 'Made in bedrooms in Bow and broadcast from the rooftops. The tracksuit was the press release.',
    note: 'Cold synths, 140 beats a minute, and an MC who has eight bars to prove it. Nothing here is wasted.',
    tracks: [{ title: 'Eskimo', artist: 'Wiley', year: 2002 }, { title: 'I Luv U', artist: 'Dizzee Rascal', year: 2003 }, { title: 'Pulse X', artist: 'Youngstar', year: 2002 }],
  },
];

/** Where a station sits on the dial, as a CSS left offset: the first at 5%, the last at 95%. */
export const dialPosition = (index: number, count = RADIO_STATIONS.length) => `${5 + index * (90 / Math.max(count - 1, 1))}%`;
