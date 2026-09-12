# Basketball League Portal — Project Overview & Architecture

## Goal
A domestic basketball league portal, built as a career/portfolio project to demonstrate
professional-grade (not cutting-edge) full-stack + frontend skills. Deployed on an
existing domain via Cloudflare Pages.

**Language note:** the site will be Spanish-only. No internationalization planned for
the foreseeable future.

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
- Referees/admins fill in match stats in a **Google Sheet** template after each game
- Data is **not real-time** — weekly batch or manual "after matches finish" update is fine
- The sheet is **published as a CSV link** ("File → Share → Publish to web") — no API
  credentials or service account needed
- A single scheduled Worker downloads the CSV, validates it, and **writes directly into
  D1** (same database as the website API — no HTTP call between them)
- The admin area is **deferred** (the Sheet is the primary input)

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Hosting | **Cloudflare Pages** | Serverless, free tier, Git-based auto-deploy |
| Frontend framework | **Astro** (hybrid rendering) | Ships near-zero JS by default; best Cloudflare Pages support; use `hybrid` output so most pages are prerendered/cached and a few (current match, admin) render on-demand |
| Interactive components | **React islands** within Astro | Sortable stats tables, filterable roster views — most transferable frontend skill for job hunting |
| Styling | **Tailwind CSS** | Fast responsive layout for tables/cards |
| Backend / API | **Cloudflare Pages Functions** (Workers under the hood) | `/api/matches`, `/api/teams/:id`, `/api/players/:id/stats`, `/api/standings` |
| Database | **Cloudflare D1** (serverless SQLite) | Relational data: teams, players, matches, match_stats, standings. **One D1 binding shared** by the API and the import Worker |
| Object storage | **R2 — deferred (not MVP)** | Team logos, player headshots, match photos. For MVP, serve these as static assets from the repo instead — it's a small league |
| Data ingestion | **Single Cloudflare Worker (Cron trigger)** | Downloads the published CSV, validates/transforms, and **upserts directly into D1**. A manual "Publish Update" fallback invokes the same Worker over HTTP (guarded by a secret header) — no separate import service, no internal HTTP polling |
| Auth (deferred) | **Cloudflare Access** (zero code) | Gate `/admin` with Cloudflare Access if/when the admin dashboard is built. No hand-rolled sessions/passwords for now — revisit only if building custom auth becomes a learning goal |
| PWA | `@vite-pwa/astro` | manifest.json, icons, minimal service worker — enables "Add to Home Screen" on iOS Safari and Android Chrome |
| CI/CD (optional, resume-friendly) | GitHub Actions (lint/typecheck) | Deferred — nice-to-have after the MVP is working |

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

Deferred / nice-to-haves (keep as roadmap, don't build yet):
- R2 cloud storage for images (use repo assets for now)
- Admin dashboard + login (use Cloudflare Access if/when built)
- GitHub Actions CI
- Extra stat tracking / schema refinements as the league requires

## Deployment steps
1. Push Astro repo to GitHub
2. Connect repo to Cloudflare Pages (Git integration) — auto-deploy on push to `main`
3. Bind **D1 database** to the Pages project and to the import Worker via
   `wrangler.toml` (one shared database)
4. Point existing domain to the Pages project (custom domain settings, DNS)
5. Set up the **Cron trigger** Worker for weekly CSV → D1 import, plus the manual
   "Publish Update" fallback
6. (Later) Add R2, admin via Cloudflare Access, and optionally GitHub Actions

## Open items / not yet decided
- Whether to build an admin dashboard after the MVP (Cloudflare Access or custom auth)
- Final D1 schema details (indexes, exact stat columns tracked per player/match)