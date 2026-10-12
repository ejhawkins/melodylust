import { z } from 'zod';

export const profileFields = [
  { key: 'color', label: 'Color', options: ['Burgundy', 'Butter yellow', 'Chocolate brown'] },
  { key: 'material', label: 'Fabric / material', options: ['Silk', 'Linen', 'Suede', 'Tweed'] },
  { key: 'brand', label: 'Designer / brand', options: ['Prada', 'Chanel', 'Simone Rocha'] },
  { key: 'pattern', label: 'Print / pattern', options: ['Floral', 'Leopard', 'Stripes', 'Polka dots'] },
  { key: 'item', label: 'Item', options: ['Dress', 'Blazer', 'Bag', 'Boots'] },
  { key: 'fit', label: 'Shape / fit', options: ['Oversized', 'Fitted', 'Wide leg', 'A-line'] },
  { key: 'details', label: 'Details', options: ['Pleats', 'Embroidery', 'Fringe', 'Lace trim'] },
  { key: 'occasion', label: 'Occasion', options: ['Work', 'Wedding guest', 'Evening'] },
  { key: 'season', label: 'Season', options: ['Spring / summer', 'Fall / winter'] },
  { key: 'aesthetic', label: 'Aesthetic', options: ['Romantic', 'Minimalist', 'Preppy'] },
  { key: 'music', label: 'Music', options: ['R&B', 'Hip-hop', 'Pop', 'Rock', 'Electronic', 'Jazz', 'Indie', 'Country'] },
] as const;

/** The style buckets: the Style Matrix pills, and the styles a style net can define. */
export const STYLE_GENRES = ['Y2K', 'Afrofuturist', 'Quiet Luxury', 'Grunge', 'Soft Glam'] as const;
export type StyleGenre = typeof STYLE_GENRES[number];

const selections =z.array(z.string().trim().min(1).max(100)).max(12).default([]);
export const styleProfileSchema = z.object({
  color: selections, material: selections, brand: selections, pattern: selections,
  item: selections, fit: selections, details: selections, occasion: selections,
  season: selections, aesthetic: selections, music: selections,
  artistPicks: z.array(z.object({ id: z.string().min(1).max(200), name: z.string().min(1).max(120), source: z.string().min(1).max(20) })).max(10).default([]),
  artists: z.string().trim().max(200).default(''),
  articles: z.array(z.enum(['elle-knitwear', 'bazaar-animal', 'ml-glorilla', 'ml-charli', 'ml-skuzland'])).max(5).default([]),
});
export type StyleProfile = z.infer<typeof styleProfileSchema>;
export type ProfileField = typeof profileFields[number]['key'];
export const emptyStyleProfile = (): StyleProfile => styleProfileSchema.parse({});
export const STYLE_PROFILE_KEY = 'ml-style-profile-v1';
export const editorialReferences = [
  { id: 'elle-knitwear', title: 'Winter 2024 Knitwear Trends: The New Age of Bold Knitwear', publisher: 'ELLE', topic: 'Expressive knitwear, bold colors and graphic prints', url: 'https://www.elle.com/fashion/trend-reports/a62859271/winter-2024-knitwear-trends/' },
  { id: 'bazaar-animal', title: 'Cheetah, Leopard, Snake! Animal Prints Are Taking Over This Winter', publisher: "Harper’s BAZAAR", topic: 'Animal prints and maximalist dressing', url: 'https://www.harpersbazaar.com/fashion/trends/a63184409/animal-print-fashion-trend-2024/' },
  { id: 'ml-glorilla', title: 'GloRilla talks tea, hands-free', publisher: 'Melody Lust', topic: 'Statement accessories and hip-hop styling', storyId: 12 },
  { id: 'ml-charli', title: 'Rock music, not actually rock', publisher: 'Melody Lust', topic: 'Rock attitude, faux fur and lace', storyId: 1 },
  { id: 'ml-skuzland', title: 'Who is Skuzland?', publisher: 'Melody Lust', topic: 'Experimental music and expressive nightlife style', storyId: 3 },
] as const;

export function profileSelectionCount(profile?: Partial<StyleProfile> | null) {
  if (!profile) return 0;
  return profileFields.reduce((total, field) => total + (profile[field.key]?.length ?? 0), 0) + (profile.articles?.length ?? 0) + (profile.artists ? 1 : 0) + (profile.artistPicks?.length ?? 0);
}

export function styleSearchInput(prompt: string, profile?: StyleProfile) {
  if (!profile || !profileSelectionCount(profile)) return prompt;
  const references = editorialReferences.filter(article => profile.articles.some(id => id === article.id))
    .map(({ title, publisher, topic }) => ({ title, publisher, topic }));
  return JSON.stringify({ query: prompt, preferences: profile, editorialReferences: references });
}
