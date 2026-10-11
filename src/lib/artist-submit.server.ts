// The artist submission steps, given a database connection, so duplicate handling and spam
// rules are tested with a stand-in database. Called by submitArtist in artists.functions.ts.

import type { SupabaseClient } from '@supabase/supabase-js';
import { checkProfileUrl, looksLikeSpam, normalizeArtistName, submissionInputSchema, type SubmissionResponse } from './artist-search';
import type { z } from 'zod';

type Db = Pick<SupabaseClient, 'from'>;
/** Double quotes delimit values inside a PostgREST or() filter; a URL never needs them. */
const quoted = (value: string) => `"${value.replace(/"/g, '')}"`;

export async function submitArtistWith(db: Db | null, data: z.output<typeof submissionInputSchema>, submitterHash: string, now: number): Promise<SubmissionResponse> {
  // Bots get the normal confirmation and nothing is saved, so they learn nothing.
  if (looksLikeSpam(data, now)) return { status: 'created' };
  const profile = checkProfileUrl(data.profileUrl);
  if (!profile.ok) return { status: 'invalid', field: 'profileUrl', message: profile.reason };
  const normalized = normalizeArtistName(data.name);
  if (!normalized) return { status: 'invalid', field: 'name', message: 'Enter the artist’s name' };
  if (!db) return { status: 'unavailable' };
  try {
    // 1. Already an approved artist (same name or same official profile)?
    const { data: existing, error: artistError } = await db.from('artists').select('name')
      .eq('status', 'approved').or(`normalized_name.eq.${normalized},source_url.eq.${quoted(profile.url)}`).limit(1);
    if (artistError) throw new Error(artistError.message);
    if (existing?.length) return { status: 'duplicate_artist', name: String(existing[0]!.name) };
    // 2. Already waiting for review?
    const { data: pending, error: pendingError } = await db.from('artist_submissions').select('id')
      .eq('status', 'pending').or(`normalized_name.eq.${normalized},profile_url.eq.${quoted(profile.url)}`).limit(1);
    if (pendingError) throw new Error(pendingError.message);
    if (pending?.length) return { status: 'duplicate_pending' };
    // 3. Save as pending. Never added to approved artists here.
    const { error: insertError } = await db.from('artist_submissions').insert({
      name: data.name, normalized_name: normalized, profile_url: profile.url, profile_host: profile.host,
      note: data.note || null, status: 'pending', submitter_hash: submitterHash,
    });
    // 23505: the database's one-pending-per-name/link rule caught a simultaneous submission.
    if (insertError?.code === '23505') return { status: 'duplicate_pending' };
    if (insertError) throw new Error(insertError.message);
    return { status: 'created' };
  } catch (failure) {
    console.error('[Artists] submission failed', failure instanceof Error ? failure.message : failure);
    return { status: 'error' };
  }
}
