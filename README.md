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
