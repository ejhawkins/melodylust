# One-page Styling Notes community and Vercel release

## Goal
Keep Melody Lust as one continuous page and add a Styling Notes chapter directly after The Want List. Signed-in visitors can submit styling ideas with up to four photos and a song pick; every submission waits for review before appearing publicly. Add a GitHub Actions pipeline that deploys the full-stack app to Vercel.

## Experience
- Add a clear “Share your Styling Notes” action within The Want List that transitions into the adjacent Styling Notes chapter without navigating to another page.
- Design the new page in Melody Lust’s dark editorial system: Big Shoulders display type, Bodoni accents, paper-like rules, plum/ink surfaces, and orange actions.
- Show approved notes in a responsive editorial grid with a lead image, optional gallery, styling title and description, author display name, garment/style tags, song artist, track, and why it fits.
- Add empty, loading, error, pending-review, and signed-out states. Signed-out visitors can browse and receive an inline sign-in invitation when they try to contribute.
- Give signed-in authors a “My submissions” view where pending, approved, and rejected notes remain visible and their own notes can be edited or deleted.
- Add original motion inspired by Jason Yuan’s portfolio rhythm: a full-viewport editorial wipe between major chapters, masked headline reveals, image clip transitions, and staggered note entrances. Keep the motion in Melody Lust’s visual language rather than copying the reference, and reduce it to simple fades when reduced motion is requested.

## Submission flow
- Add email/password and Google sign-in, confirmation handling, sign-out, forgot-password, and password reset in focused one-page dialogs/states rather than separate content pages.
- Ask each author for a public display name; do not expose their email.
- Provide a validated form for title, styling idea, optional garment/style tags, song artist, track, a short “why this song” note, and one to four photos.
- Preview selected photos before upload; accept common image formats only, enforce file count and size limits, and preserve an accessible text alternative for every photo.
- Save new or materially edited submissions as `pending`; show a clear confirmation that review is required.

## Review and safety
- Add separate user and moderator roles with server-verified permissions.
- Add a moderator-only queue within the same Styling Notes chapter where moderators can preview a note, approve it, or reject it with an author-visible reason.
- Public visitors can read only approved notes. Authors can read and manage only their own hidden notes. Moderators can review all submissions.
- Validate all text and uploads on both the page and server, derive ownership from the signed-in session, and keep private account data out of the public feed.

## Data and storage
- Enable Lovable Cloud for accounts, durable posts, roles, and photo storage.
- Create profile, styling-note, photo, and role records with explicit access policies and grants.
- Store photos in a dedicated bucket with owner-scoped upload/delete rules and public delivery only for approved content.
- Seed no invented community posts; the first screen uses an intentional empty editorial state until real notes are approved.

## One-page and technical details
- Keep all public content at `/` with in-page navigation; protected author and moderation actions use authenticated server functions.
- Handle sign-in and password recovery on `/` while preserving the generated session attachment required by protected functions.
- Update the home page metadata for the expanded community experience and replace the remaining template metadata in the root document.
- Add the new Cloud-backed architecture rule to `AGENTS.md`; preserve the existing Farfetch Shop and digital-zine boundaries.

## GitHub to Vercel pipeline
- Add Vercel’s TanStack Start deployment adapter/configuration and a GitHub Actions workflow that runs tests and the production build before deployment.
- Deploy preview builds for pull requests and production for the main branch, using Vercel project, organization, and access values stored only as GitHub repository secrets.
- Document the one-time setup: import the synced GitHub repository into Vercel, add the required GitHub secrets, and mirror server/runtime settings there, including Lovable Cloud values and the existing Farfetch key.
- Do not place deployment credentials or private service values in source control. The workflow will be ready in code, but the first Vercel deployment depends on those repository and Vercel settings being supplied.

## Verification
- Verify account creation/sign-in, profile naming, one-to-four-photo submission, pending visibility, moderator approval/rejection, public appearance after approval, author edit/delete, sign-out, and password recovery.
- Confirm unauthorized users cannot edit another author’s note or access moderation actions.
- Check the full flow at phone and desktop sizes, including image previews, long copy, empty states, focus behavior, and the link from The Want List.
- Verify each chapter transition at phone and desktop sizes, direct hash links, scroll restoration, keyboard navigation, and reduced-motion behavior.
- Validate the GitHub workflow syntax and production build; once deployment credentials are configured, verify the Vercel preview and production URLs end to end.
