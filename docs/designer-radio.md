# Designer Radio

The daily scout atomically claims up to 10 curated fashion houses per UTC day. Gemini stores only cited runway-song findings, and every finding remains pending until an editor approves it.

## Review

List pending candidates:

```bash
npm run designers:review-songs
```

Verify the evidence URL, show, Spotify track, and energy before approving:

```bash
npm run designers:review-songs -- --approve CANDIDATE_UUID
```

Supply corrected playback metadata when needed:

```bash
npm run designers:review-songs -- --approve CANDIDATE_UUID \
  --spotify https://open.spotify.com/track/TRACK_ID \
  --category B
```

Reject unsupported findings:

```bash
npm run designers:review-songs -- --reject CANDIDATE_UUID
```

The same review is available in Supabase under **Table Editor → `runway_song_candidates`**. Approved rows need a valid `spotify_url`, a category from `A` through `D`, and a show season or name containing its year before they can enter `/runway-songs`.

## Daily Schedule

The GitHub Actions workflow runs every day at 14:00 UTC. Add these repository secrets before enabling it:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `GEMINI_API_KEY`

Manual runs and retries cannot exceed the database-enforced limit of 10 claimed designers per UTC day.
