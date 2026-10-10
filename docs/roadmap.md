# Roadmap — LLE PWA

## Purpose

Single source of truth for next steps and to-dos. When asked "what's next", what to
work on, or for a to-do list, consult this file first and keep it in sync as work
progresses.

## Status legend

- `planned` — agreed and queued, not started
- `in progress` — being worked on
- `blocked` — waiting on a decision or external input
- `deferred` — explicitly paused, needs a green-light
- `done` — shipped

---

## Backlog

### 1. Estadísticas — rework of "Jugadores" `planned`

- Rename the "Jugadores" section/page and bottom-nav tab to "Estadísticas".
- Update icon to a more fitting one.
- Leaderboards (new queries in `src/lib/db.ts`):
  - Puntos (score leaders)
  - Triples (3PM leaders)
  - Tiros libres (FTM / FTA / %)
  - Faltas cometidas
- "Líderes por equipo" view (team aggregates).
- **Excluded:** "fouls recibidos" — the Google Sheet does not record it (confirmed).

### 2. Jornada de descanso `planned` — depends on #5

- A rest week is represented in D1 as a `matches` row with `status='rest'`.
- The Excel→SQL workflow (#14) must emit `status='rest'` rows; every query/page that
  filters on `'finished' / 'forfeit'` must be audited to handle it.
- `Inicio` shows "Jornada de descanso" when the current week is a rest week.

### 3. Mini-calendar at top of "Calendario" `planned` — React island

- Interactive month-view strip at the top of the Calendario page (current date shown).
- Clicking a different day/month auto-scrolls to the corresponding jornada.
- If the selected day has no match, show the next upcoming fixture.

### 4. Copa — dedicated page `deferred` — needs explicit green-light

- Dedicated page, shortcut from `Inicio`.
- In-league tournament with brackets and results.
- A photo of the win posted when the tournament finishes.
- **Not started until confirmed.** This is an explicit gate.

### 5. Google Sheet manual entry `deferred` (was `in progress`) — superseded by #14

- **Removed path.** The weekly cron auto-import (cron Worker, `src/workers/import/engine.ts`,
  `POST /api/import`) has been deleted. Superseded by the Excel→SQL flow (#14).
- The sheet is being built by the user; the layout is their call.
- **Next checkpoint: the user exports the CSV and it is reviewed against this
  enumeration before any importer work starts.** Everything below is
  layout-agnostic — the row shape is still assumed to be 1 row per player×match,
  but the column block layout is not fixed yet.
- Match header (per match, usually repeated per row): week, date, time,
  home_team, away_team, home_score, away_score, status, forfeit_team
- Per player per match: team, player, number, points, 2pm, 3pm, ftm, fta, fouls
- Rest weeks as `status='rest'` rows (feeds #2)
- Planned additions from this session: `played` (#10), per-quarter + OT scores (#11).
- The old CSV reference doc (`docs/google-sheet.md`) was removed with the CSV path; the
  layout is tracked here (#5/#11).

### 6. Invert sort-arrow direction on sortable tables `planned`

- Currently (`src/styles/global.css` + `src/lib/table-interactions.ts`) an ascending
  sort shows **↑**, so the arrow points up while the lowest values are at the top —
  counterintuitive.
- Change so **↑ = "most first"** (descending) and **↓ = ascending** (fewest first);
  swap the icons in `global.css`.
- Affects all `[data-sortable]` tables: Clasificación, Jugadores, and the roster
  table on `equipos/[id]`.

### 7. Last games played + next fixtures on team page `planned`

- Below the player table on `src/pages/equipos/[id].astro`, add a section:
  - Recent finished matches: opponent, date, score, V/D/NP badge → links to
    `/partidos/[id]`.
  - Next fixtures (scheduled matches) → links too.
- New DB helper (e.g. `getTeamMatches(teamId)` reusing `matchesQuery`) that splits
  finished vs. scheduled; reuse `teamOutcome` for badges.

### 8. "Ver acta" button on match detail `planned` — depends on image storage

- On `/partidos/[id]`, add a **"Ver acta"** button that shows the uploaded photo of
  the official match report (acta).
- Needs an image per match — storage decision open: repo assets for now vs. R2
  (ties into the R2 nice-to-have below).

### 9. Hover tooltips on acronym table headers `done`

- Same tooltip pattern as `ResultBadge` (wrapper `group relative` + absolute tooltip,
  `group-hover`/`group-focus`/`group-active`, `pointer-events-none`, `tabindex="0"` +
  `aria-label`). Reusable `ThTooltip.astro` component; no tooltip on plain-text headers.
- Acronym → meaning:
  - **PJ** «Partidos jugados», **V** «Victorias», **D** «Derrotas», **NP**
    «No presentado», **PF** «Puntos a favor», **PC** «Puntos en contra», **+/-**
    «Diferencia de puntos», **PTS** «Puntos», **P** «Puntos», **Pts/PJ**
    «Puntos por partido»
  - **2P** «Tiros de 2 anotados», **3P** «Triples anotados», **TL**
    «Tiros libres anotados», **TLI** «Tiros libres intentados», **TL%**
    «Porcentaje de tiros libres», **Fal** «Faltas», **RACHA** «Últimos 5 partidos»
  - Applies to: Clasificación + Inicio standings (PJ/V/D/NP/PF/PC/±/PTS/RACHA), Jugadores
    (PJ), Equipos/`[id]` roster (PJ/Pts·PJ/2P/3P/TL%), Partido/`[id]` box score
    (P/2P/3P/TL/TLI/Fal).

### 10. Non-playing players — `played` column `planned` — depends on #5

- New `played` (`SI`/`NO`) column; `played=NO` rows are dropped by the Excel→SQL
  workflow (#14).
  Blank defaults to `SI` so existing sheets stay valid.
- **No DB change.** The "a row in `match_stats` = the player played" invariant
  holds, so `src/lib/db.ts` is untouched.
- Dropping the row is only safe because the sheet's roster tab handles typos:
  dorsal consistency is the sheet's problem, not the importer's.
- Validation: `played=NO` with any non-zero stat is an error, not a silent zero —
  otherwise a typo deletes a real performance from every aggregate.
- `NP` is already team-level *no presentado* (forfeit, `src/components/ResultBadge.astro:3-10`)
  — a player who did not play needs a distinct label plus a `src/lib/format.ts:11-29` entry.

### 11. Quarter scores + overtime (prórroga) `planned` — depends on #5

- Per-quarter team scores `home_q1..q4` / `away_q1..q4`, plus `home_ot1..ot3` /
  `away_ot1..ot3` (blank = not played), plus the final score. OT = 5 min each
  (FIBA) → no per-period minutes. Player stats stay whole-match aggregates.
- **`home_score`/`away_score` stay the FINAL score including OT**, so `diff` and
  `teamOutcome()` need no changes; the Excel→SQL workflow (#14) recomputes standings.
  Regulation is derived as `final − ΣOT`.
- Open concern: repeating 16 score columns across every player row of a match
  (~20 rows) means ~320 redundant cells, with 16 silent-divergence paths per match.
  Recommended: an `Acta` tab (1 row per match) + an `Estadísticas` tab
  (1 row per player) + a non-imported `Jugadores` roster tab driving autofill.
  Layout is the user's call (#5); the Excel→SQL workflow adapts to whatever is exported.
- DB: 16 flat nullable `INTEGER` columns on `matches` (migration `0006_*`; `0005` is
  `players.year`, see #12);
  SQLite backfills existing rows. `matchesQuery` (`src/lib/db.ts:111-127`) unchanged —
  only `getMatch` (`src/lib/db.ts:269-285`) needs them, so Calendario/Inicio stay lean.
  Alternative: `match_periods(match_id, period, home, away)` — cleaner scoreboard
  UI and unlimited periods, but a new table + second query.
- `forfeit_team` forces 20-0 → all quarter/OT columns to `NULL`.
- Validation to add:
  - `home_score == Σ home_q* + Σ home_ot*` (same for away) — catches entry errors
  - `Q1..Q4` required when `status='finished'`, `NULL` when `'forfeit'`
  - No OT gaps (`OT2` implies `OT1`); all values `>= 0`
  - A `finished` match with `home_score == away_score` is an error — impossible
    in basketball, and `teamOutcome()` returns `null` for a draw
    (`src/lib/format.ts:58-60`) so it currently renders no result at all
- UI: `/partidos/[id]` quarter-by-quarter scoreboard (`1 2 3 4 | PR | Final`).
  Unlocks later: 4th-quarter comebacks, per-quarter averages, largest lead.

### 12. Master data is seeded, not imported `in progress` — depends on #5

- **Done (2026-10-09):** teams renamed in D1; `players` seeded with the real 96-player
  roster — dorsals `1..N` per team, `year` (birth year) populated via migration
  `migrations/0005_add_players_year.sql` and `scripts/seed-roster.mjs` (local + remote
  in sync). `matches`/`standings` mock kept for layout; `match_stats` regenerated so each
  team's player points sum to the stored scoreline.
- **The engine-side items below targeted the removed importer and no longer apply as
  written** (#5, #14); kept as design notes for the Excel→SQL workflow.
- Teams and players are uploaded to D1 manually (D1 Studio / SQL dump, per
  `docs/deploy.md`); the sheet must not create them.
- The player lookup should key on `(team, name)` — dropping `number` — and take the
  dorsal from the DB, so a dorsal split cannot duplicate a player. Detect a
  non-unique name-within-team rather than taking an arbitrary row.
- A typo'd team/player name (or a non-unique name) must be reported, not silently
  created or resolved to an arbitrary row.
- Frees `short_name` to be a real abbreviation (today it is forced to a copy of
  `name`), and lets `players.position` / `teams.logo_url` — both currently never
  written — be populated.
- Consequence: a rename must be done in the DB, not the sheet. Document the procedure.

### 13. Prune stale imported rows `planned` — needed by #10 and #11

- The Excel→SQL flow (#14) is upsert-only with no delete path, so a row removed or
  un-flagged in a later sheet revision stays in D1 forever.
- Fix: after the upsert, delete `match_stats` for matches in the updated `week` range
  whose `(match_id, player_id)` was not present in this update.

### 14. Excel → SQL import workflow `planned` — replaces the cron/engine auto-import

- The game-day workbook is aware of the D1 schema (exact table/column names) and the
  seeded player IDs, so there are no name mismatches. A separate sheet emits the SQL
  (INSERT/upsert) that injects the matches + stats; no CSV parsing, no lookup heuristics.
- Consumed by pasting the SQL into the Cloudflare D1 console; later via #15.
- Replaces the removed cron path (cron Worker, `src/workers/import/engine.ts`,
  `POST /api/import`) — all deleted.
- Consequence: the engine's `(team, name, number)` lookup fix and `ImportReport`
  changes (#12) no longer apply.

### 15. Authenticated SQL-paste endpoint `planned` — ties to the Admin dashboard nice-to-have

- A URL with login where a pasted SQL payload updates matches/stats, instead of using
  the Cloudflare D1 console directly.
- Auth via **Cloudflare Access** (no hand-rolled login). The endpoint must **not** run
  arbitrary SQL: validate/whitelist the expected INSERT/upsert shape before executing.

---

## Deferred / nice-to-haves (roadmap)

- R2 cloud storage for images (logos, headshots, match photos) — use repo assets for now.
- Admin dashboard + login (Cloudflare Access if/when built) — no hand-rolled auth.
- Extra stat tracking / schema refinements as the league requires.
- Update README.md

## Open items / not yet decided

- Whether to build an admin dashboard after the MVP (Cloudflare Access or custom auth).
- Final D1 schema details (indexes, exact stat columns tracked per player/match).
- Season scoping: `teams.name` is `UNIQUE` and `matches` has no season column, so a
  second season with a different roster will collide. Worth deciding before the
  manual seeding in #12 locks the shape in.
- Sheet column-block layout for the score block (#5, #11) — user is building the
  sheet and the exported CSV is the checkpoint before any importer work.
