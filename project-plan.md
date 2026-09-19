# Basketball League Portal — Project Overview & Architecture

## Goal
A domestic basketball league portal, built as a career/portfolio project to demonstrate
professional-grade (not cutting-edge) full-stack + frontend skills. Deployed on an
existing domain via Cloudflare Workers.

**Language note:** the site will be Spanish-only. No internationalization planned for
the foreseeable future.

## Current status (Sept 2026)

- **8-team league.** Mineros was dropped; `public/data/sample.csv` was regenerated with
  8 teams (Cebras, Vikingos, Auroras, Lobos, Dragones, Halcones, Fulgor, Toros) and 12
  matches (round-robin, weeks 1–3). Vikingos forfeits week 1 vs Cebras. The remote D1
  was fully reset and re-imported with this data.
- **Import cron.** Runs Saturdays 23:59 Madrid time: cron `59 21 * * 6` (summer / UTC+2);
  in winter (UTC+1) the trigger moves to `59 22 * * 6` — see `cron/index.js` comment.
  Deployed and verified on the cron Worker.
- **CI/CD live.** GitHub Actions (`.github/workflows/deploy.yml`) deploys web + cron on
  every push to `main`: pnpm install, `astro check`, remote D1 migrations, `wrangler deploy`
  for both Workers. Requires repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
- **D1 re-import without the secret.** Cloudflare secrets are write-only (the value can
  never be read back through any API), so `IMPORT_SECRET` can't be retrieved to re-trigger
  `/api/import`. Standard bootstrap path to (re)populate the DB: run the local import engine
  against better-sqlite3 (same setup as the tests in `src/workers/import/engine.test.ts`),
  dump the resulting tables as SQL, then apply to remote D1:
  `wrangler d1 execute lle-pwa --remote --command="$(cat dump.sql)"`.
  Note: `--file=` and stdin (`--command=-`) fail — use inline `--command`.

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
- A scheduled cron Worker POSTs to the main Worker's `/api/import` (guarded by the
  `x-import-secret` header); the main Worker downloads the CSV, validates it, and
  **writes directly into D1** (one HTTP call, Cloudflare-internal — no public DNS exposed)
- The admin area is **deferred** (the Sheet is the primary input)

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Hosting | **Cloudflare Workers** | Serverless, free tier, Git-based auto-deploy via GitHub Actions. Astro 7 deployed with the `@astrojs/cloudflare` adapter (`wrangler.jsonc`) |
| Frontend framework | **Astro** (hybrid rendering) | Ships near-zero JS by default; best Cloudflare Workers support via the adapter; use `hybrid` output so most pages are prerendered/cached and a few (current match, admin) render on-demand |
| Interactive components | **React islands** within Astro | Sortable stats tables, filterable roster views — most transferable frontend skill for job hunting |
| Styling | **Tailwind CSS** | Fast responsive layout for tables/cards |
| Backend / API | **Worker routes** served by the same deployment | `/api/matches`, `/api/teams/:id`, `/api/players/:id/stats`, `/api/standings` |
| Database | **Cloudflare D1** (serverless SQLite) | Relational data: teams, players, matches, match_stats, standings. Single D1 binding lives in the main worker; the import runs inside the main worker via `/api/import` |
| Object storage | **R2 — deferred (not MVP)** | Team logos, player headshots, match photos. For MVP, serve these as static assets from the repo instead — it's a small league |
| Data ingestion | **Cron Worker calls the main Worker over HTTP** | A separate cron Worker triggers on schedule and POSTs to `https://…/api/import` with the `x-import-secret` header. The main worker downloads the published CSV, validates/transforms, and upserts directly into D1. A manual "Publish Update" fallback POSTs to the same endpoint — no separate import service DB binding |
| Auth (deferred) | **Cloudflare Access** (zero code) | Gate `/admin` with Cloudflare Access if/when the admin dashboard is built. No hand-rolled sessions/passwords for now — revisit only if building custom auth becomes a learning goal |
| PWA | `@vite-pwa/astro` | manifest.json, icons, minimal service worker — enables "Add to Home Screen" on iOS Safari and Android Chrome |
| CI/CD | **GitHub Actions (lint/typecheck + deploy)** | Runs on push to `main`: type check, remote D1 migrations, deploy web + cron Workers |

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
2. GitHub Actions deploys web + cron Workers to Cloudflare on push to `main`
   (see `docs/deploy.md`)
3. Bind **D1 database** to the web Worker via `wrangler.jsonc` (one shared database)
4. Point existing domain to the Workers project (custom domain settings, DNS)
5. **Cron trigger** Worker weekly CSV → `/api/import` → D1, plus the manual
   "Publish Update" fallback
6. (Later) Add R2, admin via Cloudflare Access