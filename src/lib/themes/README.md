# Room themes

`theme-spec.ts` defines the themes for the Melody Lust listening room. Each theme sets palette, texture, loader motion, copy tone, content filters and a setlist.

## Rules
- `approvedOnly` is always `true`. Only approved articles feed the agent.
- `setlist` entries use a `catalogKey` ("Title|Artist") that must exist in `songCatalog` (`src/lib/song-recommendations.ts`). `theme-spec.test.ts` enforces this.
- Never put Spotify API data (track names, metadata, audio features, playlists) into theme files, prompts or embeddings. Spotify's Developer Policy forbids ingesting Spotify Content into AI models. Spotify is used for playback only.
- `genres` use the catalog's names: R&B, Hip-hop, Pop, Rock, Electronic.
- Visitor theme choice lives in the URL or local storage. No accounts, no profile tables.
- Evidence quotes from the AI step must still be exact substrings of a named approved article.

## Adding a theme
1. Add the id to `ThemeId`.
2. Create the theme object and register it in `ROOM_THEMES`.
3. Pick one song per slot from `songCatalog` and give each a one-line reason.
