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

### 1. Estadísticas — rework of "Jugadores" `in progress`

- Rename the "Jugadores" section/page and bottom-nav tab to "Estadísticas". `done`
  - Route moved to `/estadisticas` (file `src/pages/estadisticas.astro`); `/jugadores` 301-redirects to it.
  - Bottom-nav + desktop-nav labels updated; icon switched to Tabler `chart-bar`.
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

### 8. Match detail enhancements — acta, quarter graph, notes `in progress`

On `/partidos/[id]`:

- **"Ver acta" button** — `done` (2026-10-14). Uploaded acta photo stored in R2
  (`acta_photo_key`); served same-origin via `src/pages/actas/[file].ts`; linked from
  the match page. See #20.
- **"Observaciones / Notas"** — `done` (2026-10-14). `matches.observations`, rendered
  on the match page. See #20.
- **"Aplazado/Adelantado desde …" badge** — `done` (2026-10-14). Derived from
  `matches.original_date` vs `matches.date`. See #20.
- **Quarter-by-quarter result evolution graph** — still `planned`; charts the score
  differential (or both scores) across Q1..Q4 + OT using the `home_q*`/`away_q*`
  columns from #11.

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
- DB: 16 flat nullable `INTEGER` columns on `matches` — **now live:**
  `migrations/0012_extend_matches.sql` (see #20). SQLite backfills existing rows.
  `matchesQuery` (`src/lib/db.ts:111-127`) unchanged — only `getMatch`
  (`src/lib/db.ts`) needs them, so Calendario/Inicio stay lean.
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
- **Done (2026-10-10):** Grayos roster corrected. `Fernando Marco López` (id 1226, 3 games)
  replaced in place by `Jaime Marco Requena` (#3, so the games carry over); `Badre Kadi
  El Megroud` (#0) and `Jorge Monge Valiente` (#1) added with no `match_stats` (render as
  0 PJ); `D'Angelo` capitalization normalized. Applied local + remote via
  `scripts/grayos-roster-update.sql`; `scripts/seed-roster.mjs` kept in sync.
- **The engine-side items below targeted the removed importer and no longer apply as
  written** (#5, #14); kept as design notes for the Excel→SQL workflow.
- Teams and players are uploaded to D1 manually (D1 Studio / SQL dump, per
  `docs/deploy.md`); the sheet must not create them.
- The player lookup should key on `(team, name)` — dropping `number` — and take the
  dorsal from the DB, so a dorsal split cannot duplicate a player. Detect a
  non-unique name-within-team rather than taking an arbitrary row.
- A typo'd team/player name (or a non-unique name) must be reported, not silently
  created or resolved to an arbitrary row.
- Frees `short_name` to be a real abbreviation, and lets `players.position` /
  `teams.logo_url` be populated.
- **Done (2026-10-10):** `teams.logo_url` is now written — Emerge (id 1) and Grayos
  (id 4) point at `/logos/*.svg`, served from R2 via the `MEDIA` binding
  (`src/pages/logos/[file].ts`), set by `migrations/0006_seed_team_logos.sql`. See the
  R2 section in `docs/deploy.md`. `src/components/TeamBadge.astro` renders the logo or
  falls back to palette initials.
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

### 15. Authenticated SQL-paste endpoint `deferred` — superseded by #20

- A URL with login where a pasted SQL payload updates matches/stats, instead of using
  the Cloudflare D1 console directly.
- Originally planned to use **Cloudflare Access**. Decision changed: auth is now
  custom (see #20), so this would extend that login rather than introduce Access.
- The Excel→SQL workflow (#14) is still pasted into the D1 console; routing it through
  an authenticated endpoint here remains a nice-to-have.

### 16. UI/PWA chrome fixes `planned`

- Navbar: gradient treatment for the status area + general navbar fixes.
- Footer color change.
- Bottom safe-area padding for PWA — text clipped at screen borders
  (viewport/`env(safe-area-inset-bottom)` issue).

### 17. Inicio rework `done` — 2026-10-15

- Removed the `LIGA ELCHE BALONCESTO` banner.
- Section titles in Bebas Neue: `PRÓXIMA JORNADA`, `ÚLTIMA JORNADA`, `CLASIFICACIÓN`.
- `PRÓXIMA JORNADA` = `getUpcomingWeek(lastPlayedWeek)` — first week after the last
  played one (all of week 1 before the season starts). `ÚLTIMA JORNADA` =
  `getLastPlayedWeek()` (max week with a `finished`/`forfeit` match); the whole section
  is hidden until at least one match has a result. Order: Próxima → Última → Clasificación.
- Shared card layout extracted to `src/components/MatchGrid.astro`.

### 17b. Unplayed-match score badge `done` — 2026-10-15

- `src/components/ScoreBadge.astro` replaces the `– –` score chip. Played → `H – A`
  (Bebas Neue, tabular); not played → `PRÓXIMAMENTE` (full) / `PRÓX.` (narrow screens,
  `<640px`) with `title="Próximamente"`. Used on Inicio, Calendario (card variant) and
  the match page (hero variant).

### 18. Fix PWA app logo on Android `planned`

- The installed PWA logo renders incorrectly on Android (manifest icons /
  maskable icon issue) — fix the icon set so the home-screen logo displays
  correctly.

### 19. Match venue ("Lugar") `done` — implemented as the `venues` table (#20)

- Every match records the court it is played at. **Decision changed:** implemented as a
  `venues` table (`migrations/0011_create_venues.sql`) with `matches.venue_id` FK
  (`0012_extend_matches.sql`), not a `place TEXT` + `src/lib/places.ts` enum.
- 5 venues seeded (`scripts/seed-calendar.sql`), each with a Google Maps URL; getters in
  `src/lib/db.ts` (`getVenues`). Editable by admins in the Jornadas schedule board (#20).
- Public surfacing `done` (2026-10-15): `MatchRow`/`MatchDetail` now join `venues`
  (`venue_name`/`venue_short`/`venue_maps`). `src/components/VenueLink.astro` renders the
  sede name as a Google Maps link (full name on ≥sm, `short_name` on mobile). The match
  page shows it after the time, separated by `·` alongside Jornada/hour. Match cards
  (Inicio + Calendario) were reverted to their original layout with no venue info.

### 20. Admin panel — auth, actas, jornadas `in progress` — built 2026-10-14, local only

Password-protected area at `/admin` (not linked from the public nav). Deployed: **no**
— local-only so far; remote migrations not applied. Routes are network-only in the
service worker (`public/sw.js`, `VERSION` → `lle-v5`).

- **Auth (custom, replaces Cloudflare Access for this).** `src/lib/auth.ts` +
  `migrations/0013_admin_auth.sql` (`admin_users`, `admin_sessions`): PBKDF2-SHA256
  per-user salt, constant-time compare, 5-failure/15-min lockout, sliding 1 h idle +
  8 h absolute sessions (`lle_admin` cookie, HttpOnly/SameSite=Strict, `Secure` only on
  https). Users from the `ADMIN_USERS` secret (`.dev.vars` locally,
  `scripts/gen-users.mjs`). Roles: `admin` and `referee`; middleware blocks referees
  from `jornadas` pages and the schedule/postpone APIs. `Cache-Control: no-store` +
  `X-Robots-Tag: noindex, nofollow`.
- **Actas.** `admin/actas/*` + `components/admin/ActaForm.tsx` (React island) +
  `api/admin/matches/[id]/results.ts`. Validates via one shared plain-TS module
  (`src/lib/validation/match-acta.ts`): quarters+OT sum to final, player points sum to
  team total, roster membership, fouls (≤5), TLI ≥ TLA, no ties, forfeit → 20-0 with
  NULL quarters. Delete+reinsert `match_stats`, recompute `standings` in one batch.
  Statuses: `scheduled` / `finished` / `forfeit` / `postponed` / `cancelled`.
  Photo upload to R2 via `api/admin/matches/[id]/acta-photo.ts`.
  - **Result only.** If only «Anotación por cuartos» is filled (no player stats), the main
    **«Guardar acta»** button stays enabled but is relabelled
    `⚠ Guardar solo resultado del partido` (amber) and saves the scoreline with no stats
    (`resultOnly` flag skips `validateTeamStats`). As soon as any player stat is entered the
    warning disappears and «Guardar acta» disables until the full acta validates. The week
    list then shows an amber **«Pendiente estadísticas»** badge (finished + `stat_count = 0`)
    instead of green «Registrado»; the row button reads «Completar estadísticas». Public
    match page still shows the score with a "no stats yet" note.
  - Successful save redirects to `/admin/actas/{week}`.
  - Unsaved-changes guard: `components/admin/use-unsaved-changes.ts` (native
    `beforeunload` only — link/logout/refresh/back/close). Used by the acta form and
    the schedule board.
  - Acta table columns (compact): `#`, Jugador, **Presentado** (checkbox), 2P, 3P,
    **TLA**, **TLI**, Faltas (0–5 dropdown, keyboard-selectable), Pts. Footer sums the
    player points («Suma puntuación jugadores», red when it doesn't match the score).
    Each team's table spans the full width, stacked (local team first, then visitor) so
    long names don't force horizontal scroll.
- **Jornadas.** `admin/jornadas/cambiar.astro` + `components/admin/ScheduleBoard.tsx`:
  edit date/time/venue and postpone. `matches.venue_id` (§#19), plus
  `observations`, `acta_photo_key`, `original_date` (`0012_extend_matches.sql`).
  `original_date` drives the "Aplazado/Adelantado" badge (§#8). Conflict detection
  (`api/admin/jornadas/conflicts.ts`, `getTeamConflicts`/`getVenueConflicts`/
  `getAvailableRainDates`) — **hard blocks** (409): a change that double-books a team
  or a venue/time is rejected; the UI disables confirm while conflicts exist. Rain-date
  suggestions come from `special_dates` (`0014_special_dates.sql`).
- **Local data.** Migrations `0010` (rewritten FK-safe) and `0011`–`0014` applied to
  local D1; `scripts/seed-calendar.sql` seeded 56 matches / 105 players / 5 venues /
  20 special dates (match ids 109–164).
- **Remaining.** Apply migrations + seed to remote, deploy, rotate the exposed
  passwords, and do the mobile preview pass. Excel→SQL workflow (#14) still separate.

---

## Deferred / nice-to-haves (roadmap)

- R2 cloud storage for images (logos, headshots, match photos). **Logos live (2026-10-10)**
  and **acta photos live (2026-10-14)**: bucket `lle-pwa-assets`, `MEDIA` binding,
  same-origin routes `/logos/*` and `/actas/*` with CSP headers (see `docs/deploy.md`).
  Headshots still pending.
- Admin dashboard + login — **built (2026-10-14)** as custom auth, not Cloudflare Access.
  See #20.
- Extra stat tracking / schema refinements as the league requires.
- Update README.md

## Open items / not yet decided

- ~~Whether to build an admin dashboard after the MVP (Cloudflare Access or custom auth).~~
  Decided 2026-10-14: custom auth + admin panel built (#20). Cloudflare Access dropped.
- Final D1 schema details (indexes, exact stat columns tracked per player/match).
- Season scoping: `teams.name` is `UNIQUE` and `matches` has no season column, so a
  second season with a different roster will collide. Worth deciding before the
  manual seeding in #12 locks the shape in.
- Sheet column-block layout for the score block (#5, #11) — user is building the
  sheet and the exported CSV is the checkpoint before any importer work.
