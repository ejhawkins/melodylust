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

- Keep this editorial journal on the index route; category filtering and article reading stay browser-only, while the quiz persists its validated taste profile only in device storage to personalize search without accounts.
- Keep the style-profile schema, vocabulary, and verified editorial metadata in a client-safe module shared by quiz and server validation; explicit search attributes override profile defaults to preserve reader intent.
- Keep editorial style-search presentation in its own component on the index route; use a validated public server function for one-shot AI recommendations and request-local server-only Responses helpers so credentials never reach the browser.
- Define editorial styles and semantic color roles in src/styles.css and expose interactive visual variants through the shared Button component for consistent theming.
- Build animated headings as word groups of letter spans (never a literal space as its own flex item), and gate the reveal on an IntersectionObserver flag so motion only runs once the block is in view — a space glyph sized as a flex item blows the heading wider than its column.
- Read third-party services through a createServerFn in src/lib/*.functions.ts with the credential read inside the handler, and keep the payload-to-UI conversion in a plain sibling module that is unit-tested without credentials — this keeps keys out of the browser bundle and lets the mapping be verified before any key exists.

