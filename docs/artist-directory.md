# Artist directory and submissions

The style quiz's fourth step offers artist autocomplete and a submission form. Picks retain an ID, display name and source in the existing device-local profile; old profiles default to an empty list. Artist identity never establishes fashion evidence.

## Setup

1. Run all of `supabase/migrations/20261011120000_artists.sql` in the Supabase SQL Editor. `npm run db:check` verifies the tables are accessible. The tables use RLS with no public policies; server-side credentials are required.
2. Set server-only `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`). Set a long random `RATE_LIMIT_SALT`.
3. Choose `ARTIST_PROVIDER=mock` for labelled fictional records, `freqblog` with `FREQBLOG_API_KEY` on an eligible paid plan, or leave empty for approved database records only. Never prefix credentials with `VITE_`.
4. Restart the server after environment changes. The development launcher watches `.env` and `.env.local`.

Search returns approved database matches first, then external suggestions. Separate states identify incomplete results, errors, offline use, limits, and no matches. Submissions validate public HTTPS profile links, check existing artists/pending requests, and save only as pending. Honeypot and timing checks discard basic spam; pending uniqueness is enforced in the database.

## Verification

- `npx vitest run --maxWorkers=2`
- `npm run typecheck`
- `npm run build`
- Mock: type `ve` in quiz step four; choose between two Velvet Static artists by genre using arrows and Enter. Save/reopen/remove the pick. Type `zzqx` to open a prefilled submission form.
- Live database: submit a clearly identified QA record, check it is pending and no approved artist was added, repeat for the duplicate message, then delete that exact QA record.
- FreqBlog: type `ush` and verify a source badge, sample track and attribution. Provider failures must preserve database results and show the incomplete-results note.

## Limits and provenance

FreqBlog's search returns tracks with artist names, not artist IDs or images. Its suggestions use name-derived identifiers and cannot resolve distinct artists sharing a name. Reviewer-approved database UUIDs, or a future verified identity provider, are needed for those cases. External suggestion metadata retains provider/query/time/track IDs; selected profile picks retain ID/name/source only. Reviewers must preserve external provenance when promoting records.

Findable FreqBlog attribution appears with its suggestions. Respect the paid-plan caching/display terms, including deleting cached FreqBlog data within 90 days of cancellation. Do not export provider data as a feed or dataset.

Rate limits are per server instance (60 searches/minute and 5 submissions/hour per hashed client IP), not distributed across a serverless fleet. IP headers must come from a trusted deployment proxy. Official-profile ownership is checked by reviewers; URL validation does not verify ownership. VoiceOver requires a manual assistive-technology pass; automated checks cover combobox labels, keyboard selection, live status, and mobile overflow.
