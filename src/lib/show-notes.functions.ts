import { createServerFn } from '@tanstack/react-start';
import { readStoredShowNotes, SHOW_NOTES_PREFIX, type ShowNotes } from './show-notes';

/** Every saved set of show notes, by showKey. Notes are written ahead of time by scripts/show-notes.ts; this only reads. */
export const getShowNotes = createServerFn({ method: 'GET' }).handler(async (): Promise<Record<string, ShowNotes>> => {
  const { getDb } = await import('./db.server');
  const db = getDb();
  if (!db) return {};

  const { data, error } = await db.from('product_cache').select('key,products').like('key', `${SHOW_NOTES_PREFIX}%`).limit(500);
  if (error) {
    console.error('[Show notes] could not load notes', error.message);
    return {};
  }
  return Object.fromEntries((data ?? []).flatMap(row => {
    const notes = readStoredShowNotes(row.products);
    return notes ? [[row.key as string, notes] as const] : [];
  }));
});
