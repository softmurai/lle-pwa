# Basketball League Portal — Project Overview & Architecture

## Goal
A domestic basketball league portal, built as a career/portfolio project to demonstrate
professional-grade (not cutting-edge) full-stack + frontend skills. Deployed on an
existing domain via Cloudflare Workers.

**Language note:** the site will be Spanish-only. No internationalization planned for
the foreseeable future.

## Current status (Sept 2026)

- **8-team league.** `teams` was renamed in D1 and `players` seeded with the real
  96-player roster (dorsals `1..N`, birth year via `players.year`). `public/data/sample.csv`
  and matches/standings are kept as a layout mock; `match_stats` was regenerated so each
  team's player points sum to the stored scoreline.
- **CI/CD live.** GitHub Actions (`.github/workflows/deploy.yml`) deploys the web Worker on
  every push to `main`: pnpm install, `astro check`, remote D1 migrations, `wrangler deploy`.
  Requires repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
- **Data updates.** The auto-import cron path was removed (cron Worker, `/api/import`,
  engine). Results are loaded via the Excel→SQL workflow (roadmap #14/#15).

## Core requirements
- Classic desktop "web explorer" experience
- "Add to Home Screen" support on iOS and Android (PWA) — no native app, no App
  Store / Play Store fees
- Match calendar
- Current week's match highlight
- Team stats
- Teams classification / standings
- Team players / roster stats

## Data flow
- Referees/admins fill in match stats in a **Google Sheet** after each game
- Data is **not real-time** — weekly batch or a manual "after matches finish" update is fine
- An Excel→SQL workflow (aware of the D1 schema and the seeded player IDs) generates the
  INSERT/upsert statements, applied to D1 from the Cloudflare console (roadmap #14), later
  via an authenticated endpoint (roadmap #15)
- The admin area is **deferred** (the Sheet is the primary input)

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Hosting | **Cloudflare Workers** | Serverless, free tier, Git-based auto-deploy via GitHub Actions. Astro 7 deployed with the `@astrojs/cloudflare` adapter (`wrangler.jsonc`) |
| Frontend framework | **Astro** (hybrid rendering) | Ships near-zero JS by default; best Cloudflare Workers support via the adapter; use `hybrid` output so most pages are prerendered/cached and a few (current match, admin) render on-demand |
| Interactive components | **React islands** within Astro | Sortable stats tables, filterable roster views — most transferable frontend skill for job hunting |
| Styling | **Tailwind CSS** | Fast responsive layout for tables/cards |
| Backend / API | **Worker routes** served by the same deployment | `/api/matches`, `/api/teams/:id`, `/api/players/:id/stats`, `/api/standings` |
| Database | **Cloudflare D1** (serverless SQLite) | Relational data: teams, players, matches, match_stats, standings. Single D1 binding lives in the main worker |
| Object storage | **R2 — deferred (not MVP)** | Team logos, player headshots, match photos. For MVP, serve these as static assets from the repo instead — it's a small league |
| Data ingestion | **Excel → SQL → D1** | The game-day workbook emits INSERT/upsert SQL (aware of the D1 schema and the seeded player IDs). Applied from the Cloudflare D1 console (roadmap #14), later via an authenticated SQL-paste endpoint (roadmap #15) |
| Auth (deferred) | **Cloudflare Access** (zero code) | Gate `/admin` with Cloudflare Access if/when the admin dashboard is built. No hand-rolled sessions/passwords for now — revisit only if building custom auth becomes a learning goal |
| PWA | `@vite-pwa/astro` | manifest.json, icons, minimal service worker — enables "Add to Home Screen" on iOS Safari and Android Chrome |
| CI/CD | **GitHub Actions (lint/typecheck + deploy)** | Runs on push to `main`: type check, remote D1 migrations, deploy the web Worker |

## Rough D1 schema (to refine)
- `teams` (id, name, logo_url, ...)
- `players` (id, team_id, name, position, ...)
- `matches` (id, home_team_id, away_team_id, date, week, ...)
- `match_stats` (id, match_id, player_id, points, rebounds, assists, ...)
- `standings` (team_id, wins, losses, points_for, points_against, ...) — **recomputed on
  import** (simpler and correct at league scale)

## MVP order (build this first, then iterate)
1. **Read-only portal** — calendar, current match, standings, team/roster stats
2. **Import pipeline** — Sheet published CSV → Worker → D1 (end-to-end data path)
3. **PWA** install support

Deferred / nice-to-haves and open decisions moved to [`docs/roadmap.md`](docs/roadmap.md) —
consult it for backlog, deferred work, and open items.

## Deployment steps
1. Push Astro repo to GitHub
2. GitHub Actions deploys the web Worker to Cloudflare on push to `main`
   (see `docs/deploy.md`)
3. Bind **D1 database** to the web Worker via `wrangler.jsonc` (one shared database)
4. Point existing domain to the Workers project (custom domain settings, DNS)
5. Load master data (teams/players) into D1; results via Excel→SQL (roadmap #14)
6. (Later) Add R2, admin via Cloudflare Access