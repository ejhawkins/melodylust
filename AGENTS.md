<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the digital zine in a dedicated component with page-flip loaded after hydration; isolate its mutable booklet DOM from React to preserve SSR and safe cleanup.
- Source the home Shop catalogue through the server-side Farfetch RapidAPI adapter; never expose its key or restore demo product rows when the provider is unavailable.
- Keep Styling Notes on the home page; store submissions and moderation in Lovable Cloud, with signed-photo delivery and server-verified ownership and roles.
- Keep song-panel inspiration bookmarks separate from community submissions and persist them on the visitor's device, so saving a reference never publishes an unreviewed note.
- Ship code to github.com/ejhawkins/melodylust through the GitHub connector's git API (blobs → tree with base_tree → commit → PATCH ref), never by rewriting Lovable's own git history; Lovable's Git sync only creates new repos.
- When uploading a file through that connector, send its content as raw text — the connector encodes it for GitHub; pre-encoding to base64 stores the base64 text itself.
- Keep every column the app writes present in the database schema, including columns the code adds itself (an article's source, a scouted link's uniqueness) — a missing column only surfaces when that write path runs.
- Keep featured-song collage motion in its dedicated component with a scoped scroll controller and separate sample metrics, so search logic and sourced song data remain untouched.
- The Listening Room is the home page at /; the former editorial home lives at /home and /listen redirects to /, so old links keep working.
- Keep Listening Room playlist sizing scoped to its playlist class and use shrink-safe grids for the header, song rows, and player; this preserves adjacent views while preventing narrow-screen clipping.
- Pass mobile playback eligibility from the Listening Room into its product card; scope and cancel the reveal timer there so idle page loads and desktop playback cannot open it.
- Apply the fig/acid-lime identity by remapping the global shadcn tokens in one site-wide block near the end of styles.css, so every page follows one palette source.
- Keep the phone section row in ListenIssueDock (hero + pinned variants sharing one handler) so in-hero tabs and the sticky dock never drift apart.
- Keep the Listening Room Studio (library, add-to-playlist, Spotify embed previews, share card, importer) in ListenStudio with its own device-stored catalogue in lib/studio, so it never alters the existing caption-based playlists.
- Keep the Style Matrix as the FitCompass component fed by lib/fit-compass (one item, four quadrant looks); votes go only through server functions that return aggregate counts, so voter ids never reach the browser.
