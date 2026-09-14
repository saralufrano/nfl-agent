# Red Zone — NFL Matchup Dashboard

A responsive, dark-mode personal NFL matchup desk built with Next.js and TypeScript.
This first screen uses explicitly labeled demo data, so it runs without API keys.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Run `npm run build` to create the
production build used by Vercel.

## Data boundary

`lib/data.ts` is the demo data provider. The UI consumes the normalized types in
`lib/types.ts`, keeping a future live-data integration separate from presentation.

## Current scope

- Game slate with the 49ers pinned first
- Interactive matchup selection
- Season-average and last-five-games team comparisons
- Injury reports and explicit unavailable-stat states

Live data, scheduled analysis, saved picks, and news are intentionally deferred.

## Deploying to Vercel

The repository includes `vercel.json` so Vercel explicitly detects the project as
Next.js and runs the production build. In the Vercel project settings, use the
repository root as the **Root Directory** and leave the **Output Directory** blank.
The Node.js runtime is pinned to the Vercel-supported `22.x` major line; do not use
an open-ended `>=` engine range because Vercel requires a supported major version.

After the first successful production deployment, assign the desired domain under
**Settings → Domains**. A Vercel `404: NOT_FOUND` page (rather than this app's own
UI) means the hostname is not assigned to an active deployment; redeploy the
production branch and reassign the domain. It is not a missing `/` route—the app's
root route is defined in `app/page.tsx`.
