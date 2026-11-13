# Roadmap

- [x] Add The Swivel after Fashion’s capsule, using real product layers and tap-only model previews.
- [x] Verify gestures, keyboard, locked shuffle, saves and reduced motion; ring maths and all 404 tests pass.

- [x] Add Reading Room navigation and reuse the zine in the home feed.
- [x] Add lazy single-page reading, persistence, reduced-motion fallback, saves and issue sharing; verified phone/desktop, original /home zine and 401 tests.

- [x] Add opening-film sound/restart controls and a contextual community Styling Notes entry; verified phone/desktop controls and sign-in prompt.
- [ ] Verify a signed-in film note submission and readback; blocked because Cloud has no signed-up users.

- [x] Restore server-only article/product caches and show the existing outfit while AI suggestions load; verify real artist search and product matching.

- [x] Refine Listening Room desktop proportions, playlist spacing, and phone layout using the three uploaded screenshots; verify controls and screen sizes

- [x] Replace Featured songs with a scroll-driven collage and album spotlight; labelled sample music/social metrics and verified song actions, desktop/mobile layout and reduced motion

- [x] Make the song side panel black with Add to Want List and saveable image-and-quote Style Notes; verified saves survive refresh and phone layout fits

- [x] Enable accounts, profiles, moderated Styling Notes data, roles, and photo storage
- [x] Build the one-page Styling Notes chapter and account/submission/review flows
- [x] Add editorial chapter transitions with accessible reduced-motion behavior
- [x] Add and document the GitHub-to-Vercel pipeline
- [x] Verify security, the signed-in workflow, phone/desktop presentation, and build status
- [x] Add the Banks — "This Is What It Feels Like (Goddess: Unplugged)" YouTube video to the music-video chapter
- [x] Point melodylust.fashion and www at Lovable — DNS added at Vercel, Check status confirmed, live on the custom domain
- [x] Rotate the hero headline word: MUSIC → STYLE → FASHION → FAVORITE RUNWAYS
- [x] Remove the white wipe panel from the "THIS IS A MOOD" film section (texts and colors unchanged)
- [x] Keep the hero logo and headline black while replacing the beige wash with a cool inverted overlay
- [x] Add an original runway editorial as the second animated hero concept
- [x] Re-cut the second hero's coat as black-and-white houndstooth, with the menu row kept readable over it
- [x] Center the rotating hero headline on every screen (fix applied, verifying)
- [x] Add a playlist chapter to the digital zine with tracks from the featured artists, linked to their music
- [x] Bring EXPERIENCE / GET READY tight under the hero headline (headline bottom-anchored, no dead line)
- [x] Give the record arc 20% more gap between sleeves (200→240 desktop, 57→68 tablet), keeping every sleeve inside the screen
- [x] Give the Circles drop-in a pebble bounce: fall, land with a squash, two shrinking bounces, settle in place
- [x] Remove the artist name labels from the record sleeves (screen-reader names and the credit line kept)
- [x] Copy today's code into github.com/ejhawkins/melodylust on branch lovable/oct-12-sync (208 files, verified file-for-file)
- [x] Sync this project to lovable/oct-12-sync at c4a768b (67 files pulled: search engine, search components, tests, scripts); 0 differences left
- [x] Add the secrets the branch needs: OPENAI_API_KEY, GEMINI_API_KEY, MELODYLUST_AI_PROVIDER=gemini, RAPIDAPI_KEY, FREQBLOG_API_KEY, ARTIST_PROVIDER=freqblog
- [x] Give the article notebook a source column and one-row-per-link rule so scouted articles save; verified live — a search for Solange stored 8 articles awaiting review
- [x] Push the notebook fix and regenerated files to lovable/oct-12-sync (commit 890051a, 255 files, verified file-for-file)
- [x] Publish to melodylust.fashion with the restored search engine live
- [x] Fast-forward main to lovable/oct-12-sync without overwriting history (d696f36)
- [x] Add .github/workflows/deploy.yml to both melodylust branches after workflow permission approval (fe02b31)
- [x] Add a Want List button to the biggest square of every style-matrix moodboard; verified it saves, shows In Want List, and removes again
