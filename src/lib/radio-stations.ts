// Radio: Melody Lust without the runway. Each station is a scene (one sound, one city, one year)
// and the uniform it put on the street long before anyone sold it back.

export type RadioStation = { name: string; place: string; uniform: string[] };

export const RADIO_STATIONS: RadioStation[] = [
  { name: 'Mod', place: 'London ’64', uniform: ['Fishtail parka', 'Slim mohair suit', 'Button-down shirt', 'Knit polo shirt', 'Desert boots'] },
  { name: 'Northern Soul', place: 'Wigan ’73', uniform: ['High-waisted baggies', 'Bowling shirt', 'Sleeveless vest', 'Sew-on club patches', 'Leather-soled shoes'] },
  { name: 'Punk', place: 'London ’77', uniform: ['Leather biker jacket', 'Safety pins', 'Bondage trousers', 'Torn T-shirt', 'Oxblood boots'] },
  { name: 'Two Tone', place: 'Coventry ’79', uniform: ['Pork pie hat', 'Tonic suit', 'Harrington jacket', 'Black-and-white checks', 'Loafers'] },
  { name: 'Acid House', place: 'London ’88', uniform: ['Smiley-face T-shirt', 'Baggy dungarees', 'Bandana', 'Oversized hoodie', 'Trainers'] },
  { name: 'Grunge', place: 'Seattle ’91', uniform: ['Flannel shirt', 'Thermal under a tee', 'Ripped jeans', 'Oversized cardigan', 'Combat boots'] },
];

/** Where a station sits on the dial, as a CSS left offset: the first at 5%, the last at 95%. */
export const dialPosition = (index: number, count = RADIO_STATIONS.length) => `${5 + index * (90 / Math.max(count - 1, 1))}%`;
