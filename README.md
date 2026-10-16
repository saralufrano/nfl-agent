# NFL Agent 🏈
### A data-driven NFL matchup and picks dashboard

A personal product experiment exploring how to turn scattered NFL data into a single, decision-ready view of every matchup. Rather than switching between scoreboards, injury reports, odds, and weather forecasts, NFL Agent brings those signals together so fans can make informed picks and track how those decisions perform over time.

**Built and product-led by [Sara Lufrano](https://github.com/saralufrano).**

## The problem

A point spread alone doesn't tell the full story of a matchup. Evaluating a game means checking team performance, player availability, game conditions, and historical results across multiple sources. It's also easy to lose track of the exact spread available when a pick was made.

**Product hypothesis:** A unified matchup view, combined with a recorded spread at selection time and automated grading, makes NFL picks easier to evaluate consistently over a season.

## What the product does

- **NFL game tracking:** Pulls game data from ESPN for the 2026 NFL season, including scores and quarter-by-quarter scoring details.
- **Matchup context:** Displays team records and offense/defense scoring rankings derived from completed games.
- **Injury and availability watch:** Surfaces player status and role context, using Sleeper player data.
- **Spread-aware picks:** Records the selected team, spread at the time of the pick, week, and pick timestamp.
- **Automated pick grading:** Once a game is final, evaluates the saved pick against its recorded spread as a win, loss, or push.
- **Persistence with fallback:** Stores picks in browser storage, with optional server-side syncing through the picks API when a database is configured.
- **Game-day conditions:** Adds venue and weather context where data is available, using Open-Meteo forecasts.
- **Scoring breakdowns:** Separates offensive and defensive scoring where the underlying game data supports that classification.

Availability, odds, and weather depend on third-party data and may be incomplete for some games.

## Product decisions and trade-offs

| Decision | Why it matters |
| --- | --- |
| Preserve the spread at pick time | Avoids judging an earlier decision against a line that changed later. |
| Start with a focused weekly dashboard | Keeps the primary workflow—review a matchup, choose a side, revisit the result—clear. |
| Integrate existing sports data sources | Prioritizes the decision-making experience over rebuilding score and injury data pipelines from scratch. |
| Keep browser storage as a fallback | Allows the tracker to remain usable when optional database syncing is unavailable. |
| Add context alongside picks | Makes it possible to examine *why* a selection was made, not just whether it won. |

## Tech stack

- **Frontend:** Next.js 15, React 19, TypeScript
- **NFL game and odds data:** ESPN endpoints
- **Player availability:** Sleeper API
- **Weather:** Open-Meteo
- **Persistence:** Browser localStorage and optional picks API/database integration

## Run locally

Requires Node.js and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The dashboard can use browser storage without configuring the optional database integration. External data requests require network access.

## Roadmap

These are product directions, **not claims of completed features**:

- Track aggregate pick performance across the season and make trends easier to review.
- Explore richer comparisons between current matchups and prior games.
- Connect relevant NFL news to teams, players, and upcoming games.
- Continue refining the usability and reliability of the matchup and picks experience.

## Why I built it

I'm a product leader who enjoys taking an idea from a problem statement to something tangible. NFL Agent is a hands-on exercise in product discovery, prioritization, external-data trade-offs, and iterative delivery.

The interesting question isn't simply *“Can I build an NFL dashboard?”* It's *“Which information actually helps someone make and evaluate a decision—and how do I make that information usable?”*

---

*Independent personal project. Not affiliated with or endorsed by the NFL, ESPN, Sleeper, or Open-Meteo.*
