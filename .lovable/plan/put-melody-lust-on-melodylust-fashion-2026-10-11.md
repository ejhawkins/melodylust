# Put Melody Lust on melodylust.fashion

Your domain's address book currently lives at Vercel and points at Vercel. We'll
make Lovable the live site instead, so the moment you publish, the page at
melodylust.fashion is this one-pager — with a secure (https) certificate
handled for you.

```text
Today                        After
melodylust.fashion           melodylust.fashion
   -> Vercel                    -> Lovable (this site)
www.melodylust.fashion       www.melodylust.fashion
   -> Vercel                    -> redirects to melodylust.fashion
```

## What happens

1. **Publish the site.** A connected domain shows nothing until the project is
   published, so this comes first. We check for unresolved critical security
   findings, then publish.
2. **Connect the domain.** Both `melodylust.fashion` and
   `www.melodylust.fashion` are added to the project (www is never added
   automatically). Lovable then shows the exact records to add, including a
   one-time proof-of-ownership code.
3. **Swap the address records at Vercel.** Because Vercel still keeps your
   domain's address book, the changes are made there: remove the two entries
   Vercel put in for its own deployment, then add Lovable's three records.
4. **Wait for it to take effect.** The domain moves through
   "Verifying" -> "Setting up" -> "Active". The secure certificate is issued
   automatically. This can take minutes, sometimes longer.
5. **Pick the main address.** `melodylust.fashion` becomes the primary;
   `www` and the Lovable address redirect to it.
6. **Check it works from the real address.** Loading the domain, opening
   Styling Notes, signing in (including with Google), saving a note, and the
   live Shop feed — all from `https://melodylust.fashion`, not the preview.

## One thing to know before we start

You picked Lovable as the live site. That means the GitHub-to-Vercel pipeline
stops being the public site and becomes a private staging/preview build —
useful, but releases there won't change what visitors see. If you'd rather the
domain follow each release, say so and we'll point it at Vercel instead.

## Technical details

**Confirmed current state (read this turn)**
- Project is not published; no custom domain connected yet.
- `melodylust.fashion` A record -> `216.198.79.1` (Vercel); nameservers
  `ns1/ns2.vercel-dns.com`, so DNS is managed at Vercel.
- `www.melodylust.fashion` is a **CNAME** -> `*.vercel-dns-017.com` (Vercel).
- No `_lovable` TXT record exists yet.

**Records to set at Vercel** (Vercel dashboard -> project -> Settings ->
Domains -> `melodylust.fashion` -> DNS Records, or the domain's own DNS page):
- Delete: apex `A` -> `216.198.79.1`
- Delete: `www` `CNAME` -> `*.vercel-dns-017.com` (a CNAME and an A record
  cannot both exist for `www`, so it must go, not just be edited)
- Add: `A`  name `@`    value `185.158.133.1`
- Add: `A`  name `www`  value `185.158.133.1`
- Add: `TXT` name `_lovable` value `lovable_verify=<the code Lovable shows>`
- Leave the nameservers at Vercel — only the records change.

**Then in Lovable**: Project Settings -> Project section -> Domains, add both
`melodylust.fashion` and `www.melodylust.fashion`, and set the apex as Primary.

**Sign-in on the new address**: Google sign-in already redirects back to
whatever address the page is on, so it should follow the domain. If it errors
after going live, the provider's allowed origins need the new address added —
that's the one item that may need a follow-up.

**If https doesn't appear** after propagation: re-check the two A records,
remove any leftover Vercel records, and confirm no CAA record blocks
Let's Encrypt, Google Trust Services, or SSL.com.
