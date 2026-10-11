import type { SupabaseClient } from '@supabase/supabase-js';
import type { ScoutCandidate } from './article-scout.ts';

/** Discovery never downgrades an existing approved/rejected article. Approval is explicit. */
export async function saveScoutArticles(db: Pick<SupabaseClient, 'from'>, articles: (ScoutCandidate & { tracker_id?: string })[], status: 'candidate' | 'approved') {
  if (!articles.length) return;
  const { error } = await db.from('articles').upsert(articles.map(article => ({ ...article, status, source: 'scout' })), {
    onConflict: 'url', ignoreDuplicates: status === 'candidate',
  });
  if (error) throw new Error(`Could not save scouted articles: ${error.message}`);
}
