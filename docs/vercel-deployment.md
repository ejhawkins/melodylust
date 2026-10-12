# GitHub to Vercel deployment

The workflow in `.github/workflows/deploy.yml` creates preview deployments for pull requests and a production deployment for pushes to `main`.

## One-time setup

1. Import the synced GitHub repository into Vercel as a TanStack Start project.
2. Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` to GitHub repository Actions secrets.
3. In Vercel, copy the app's public and server runtime values from Lovable Cloud, plus `RAPIDAPI_KEY` and any optional provider values used by the journal. Keep private values server-only; only public browser configuration uses the `VITE_` prefix.
4. Keep automatic Vercel Git deployments disabled if this workflow is the release owner, avoiding duplicate deployments.

The pipeline runs the tests before Vercel builds. A pull request receives a preview deployment; merging to `main` creates the production deployment.