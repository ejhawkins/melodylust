/** Deterministic editorial outfit rules. Genre-to-outfit mappings are creative choices,
 * never evidence of an artist's wardrobe. Only server-resolved metadata enters here. */
import { z } from 'zod';
import { normalizeArtistName, type ArtistSource } from './artist-search';
import { articleItems } from './article-items';
import { styleProfileSchema, emptyStyleProfile, type StyleProfile } from './style-profile';
import type { EvidenceDocument } from './melodylust-evidence';
import type { EvidenceSearchResult } from './style-search';

export const artistStyleSearchSchema = z.object({
  query: z.string().trim().min(1).max(500),
  artist: z.object({ id: z.string().min(1).max(200), name: z.string().trim().min(1).max(120), source: z.enum(['melodylust', 'freqblog', 'mock']) }).strict().optional(),
  profile: styleProfileSchema.optional(),
}).strict();
export type ArtistStyleSearchInput = z.infer<typeof artistStyleSearchSchema>;
export type ResolvedStyleArtist = { id: string; name: string; source: ArtistSource | 'article'; genres: string[] };
export type StyleReason = { kind: 'music' | 'profile' | 'article' | 'baseline'; text: string; articleId?: string };
export type RankedArtistLook = { id: string; title: string; direction: string; pieces: { name: string; detail: string }[]; score: number; reasons: StyleReason[] };
export type ArtistStyleRecommendation = { artist: ResolvedStyleArtist; looks: RankedArtistLook[]; version: 1 };
export type ArtistResolution = 'verified' | 'ambiguous' | 'not_found' | 'unavailable' | 'selection_unverified';
export type TrackedStyleSearchResponse = {
  result: EvidenceSearchResult | null; articles: EvidenceDocument[]; interpretation: string; error: string;
  recommendation?: ArtistStyleRecommendation | null;
  artistResolution?: ArtistResolution;
  warning?: string;
  /** Newly added articles still being read: results may grow on the next search. */
  indexing?: { pending: number };
};

type LookRule = { id: string; title: string; direction: string; genres: string[]; tags: string[]; pieces: [string, string][] };
const rules: LookRule[] = [
  { id: 'everyday', title: 'The everyday edit', direction: 'Start with simple layers and one useful accessory.', genres: [], tags: ['Minimalist', 'Work', 'Oversized', 'Fall / winter'], pieces: [['Shirt', 'A plain cotton shirt, worn open or buttoned.'], ['Trousers', 'Straight-leg trousers with room to move.'], ['Sneakers', 'A simple pair with a low profile.'], ['Bag', 'A compact crossbody bag.']] },
  { id: 'bright', title: 'Colour in rotation', direction: 'Try a bright top against a simple, balanced silhouette.', genres: ['Pop', 'Dance'], tags: ['Butter yellow', 'Evening', 'Fitted', 'Spring / summer'], pieces: [['Knit top', 'One saturated colour over a plain base.'], ['Trousers', 'Keep the cut clean and the colour neutral.'], ['Loafers', 'A polished finish without extra embellishment.'], ['Bag', 'A small bag in a contrasting shade.']] },
  { id: 'soft', title: 'Soft after hours', direction: 'Pair fluid fabric with easy tailoring and a little shine.', genres: ['R&B', 'Soul'], tags: ['Silk', 'Romantic', 'Evening', 'Chocolate brown', 'Wide leg'], pieces: [['Shirt', 'Try a fluid satin shirt with a relaxed collar.'], ['Trousers', 'Wide-leg trousers in a soft, matte fabric.'], ['Loafers', 'A smooth leather finish.'], ['Necklace', 'One small pendant rather than layered decoration.']] },
  { id: 'relaxed', title: 'Room to move', direction: 'Balance relaxed proportions with a structured outer layer.', genres: ['Hip-hop', 'Rap'], tags: ['Oversized', 'Blazer', 'Wide leg', 'Fall / winter'], pieces: [['Blazer', 'An unstructured blazer over a plain tee.'], ['Cargo pants', 'A roomy cut with restrained pocket detail.'], ['Sneakers', 'A clean, substantial sole.'], ['Bag', 'A practical shoulder bag.']] },
  { id: 'utility', title: 'Texture and edge', direction: 'Mix worn-in texture with a simple, dark foundation.', genres: ['Rock', 'Punk', 'Metal', 'Alternative'], tags: ['Boots', 'Fall / winter', 'Fitted'], pieces: [['Jacket', 'A textured dark jacket with minimal hardware.'], ['Jeans', 'Straight denim, lightly faded if you prefer.'], ['Boots', 'A sturdy pair with a plain toe.'], ['Belt', 'One simple belt to finish the proportions.']] },
  { id: 'tailored', title: 'An easy lapel', direction: 'Use soft tailoring with a fine knit and polished shoes.', genres: ['Jazz', 'Blues'], tags: ['Preppy', 'Work', 'Tweed', 'Blazer', 'Chocolate brown'], pieces: [['Blazer', 'A softly structured jacket with a comfortable shoulder.'], ['Knit top', 'A fine-gauge knit as the base layer.'], ['Trousers', 'Straight trousers with a clean hem.'], ['Loafers', 'A polished pair in a neutral tone.']] },
  { id: 'technical', title: 'After-dark utility', direction: 'Try light technical layers with a small reflective accent.', genres: ['Electronic', 'House', 'Techno', 'EDM'], tags: ['Minimalist', 'Evening', 'Oversized'], pieces: [['Jacket', 'A lightweight nylon layer.'], ['Trousers', 'Straight technical trousers with a comfortable waist.'], ['Sneakers', 'A low-profile, practical pair.'], ['Bag', 'A small bag with a reflective detail.']] },
  { id: 'denim', title: 'Denim, kept simple', direction: 'Build around denim and soften it with an easy shirt.', genres: ['Country', 'Folk'], tags: ['Boots', 'Suede', 'Fall / winter'], pieces: [['Shirt', 'A softly washed cotton shirt.'], ['Jeans', 'Straight denim in a medium wash.'], ['Boots', 'A plain ankle boot.'], ['Belt', 'A textured belt with modest hardware.']] },
  { id: 'layers', title: 'Layers in rotation', direction: 'Use a light knit and one pattern over a quiet base.', genres: ['Indie', 'Singer/Songwriter'], tags: ['Preppy', 'Stripes', 'Oversized', 'Linen', 'Spring / summer'], pieces: [['Cardigan', 'A light knit with room for a base layer.'], ['Shirt', 'Try a small stripe or check.'], ['Trousers', 'An easy straight cut.'], ['Sneakers', 'A simple, worn-in pair.']] },
];
const same = (a: string, b: string) => normalizeArtistName(a) === normalizeArtistName(b);
// These aliases match supplied genre labels only; artist names never imply a genre.
const genreKey = (value: string) => normalizeArtistName(value).replace(/^alternative( music)?$/, 'alternative').replace(/^hip hop( rap)?$|^hiphop$/, 'hip hop').replace(/^r and b( soul)?$|^randb$/, 'r and b');

export function recommendArtistLooks(artist: ResolvedStyleArtist, articles: EvidenceDocument[], profile: StyleProfile = emptyStyleProfile()): ArtistStyleRecommendation {
  const preferences = [profile.color, profile.material, profile.pattern, profile.item, profile.fit, profile.details, profile.occasion, profile.season, profile.aesthetic].flat();
  const ranked = rules.map(rule => {
    let score = 1;
    const reasons: StyleReason[] = [];
    const genre = artist.genres.find(value => rule.genres.some(tag => genreKey(tag) === genreKey(value)));
    if (genre) { score += 5; reasons.push({ kind: 'music', text: `Music directory genre: ${genre}. Matched to an editorial outfit rule.` }); }
    for (const preference of [...new Set(preferences)]) {
      if (rule.tags.some(tag => same(tag, preference)) || rule.pieces.some(([name]) => same(name, preference))) {
        score += 2; reasons.push({ kind: 'profile', text: `Your saved preference: ${preference}.` });
      }
    }
    for (const article of articles) {
      const item = articleItems(article.summary, 12).find(item => rule.pieces.some(([name]) => same(item, name) || normalizeArtistName(item).endsWith(` ${normalizeArtistName(name)}`)));
      if (item) { score += 3; reasons.push({ kind: 'article', text: `Article mentions ${item}: ${article.title}`, articleId: article.id }); }
    }
    if (!reasons.length) reasons.push({ kind: 'baseline', text: 'A general editorial outfit. No supplied music or fashion detail matched this outfit rule.' });
    const pieces = rule.pieces.map(([name, detail], index) => ({ name, detail: index === 0 ? [detail, profile.color[0] && `Colour option from your quiz: ${profile.color[0]}.`, profile.material[0] && `Fabric option from your quiz: ${profile.material[0]}.`].filter(Boolean).join(' ') : detail }));
    return { id: rule.id, title: rule.title, direction: rule.direction, pieces, score, reasons };
  });
  ranked.sort((a, b) => b.score - a.score || rules.findIndex(rule => rule.id === a.id) - rules.findIndex(rule => rule.id === b.id));
  return { artist, version: 1, looks: ranked.slice(0, 3) };
}
