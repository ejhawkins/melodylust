import type { SupabaseClient } from '@supabase/supabase-js';
import { toTrackerCsv, type TrackerRow } from './tracker-import.ts';

/** Fetch every approved article, including beyond PostgREST's default page limit. */
export async function readApprovedTrackerCsv(db: SupabaseClient): Promise<string> {
  const rows: TrackerRow[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await db.from('articles')
      .select('id,tracker_id,url,publication,published_at,title,summary,categories')
      .eq('status', 'approved').order('id').range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Could not load approved articles from Supabase: ${error.message}`);
    for (const row of data ?? []) {
      rows.push({
        id: row.tracker_id || `db:${row.id}`,
        url: row.url, publication: row.publication, published_at: row.published_at,
        title: row.title, summary: row.summary ?? '',
        categories: (row.categories ?? []).join(', '),
      });
    }
    if (!data || data.length < pageSize) break;
  }
  return toTrackerCsv(rows);
}
