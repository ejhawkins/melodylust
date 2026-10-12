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
