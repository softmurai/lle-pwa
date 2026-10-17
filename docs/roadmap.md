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
- `dropped` — decided against (see the "Dropped" log at the end)

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
- **Excluded:** "fouls recibidos" — not tracked in the existing data (confirmed).

### 3. Mini-calendar at top of "Calendario" `planned` — React island

- Interactive month-view strip at the top of the Calendario page (current date shown).
- Clicking a different day/month auto-scrolls to the corresponding jornada.
- If the selected day has no match, show the next upcoming fixture.

### 4. Copa — dedicated page `deferred` — needs explicit green-light

- Dedicated page, shortcut from `Inicio`.
- In-league tournament with brackets and results.
- A photo of the win posted when the tournament finishes.
- **Not started until confirmed.** This is an explicit gate.

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

### 7b. Player tables default order → dorsal `done` — 2026-10-16

- `getRoster()` (team page `equipos/[id]`) and `getMatchBoxScore()` (match page
  `partidos/[id]`) now list players by dorsal — `CAST(number AS INTEGER)`, players
  without number last, name as tiebreaker — instead of `points DESC`. Header-click
  sorting on the roster table still overrides the default. Admin actas already used
  dorsal order (`getTeamPlayers()`); Jugadores stays alphabetical (cross-team list).

### 8. Match detail enhancements — acta, quarter graph, notes `done` — 2026-10-16

On `/partidos/[id]`:

- **"Ver acta" button** — `done` (2026-10-14). Uploaded acta photo stored in R2
  (`acta_photo_key`); served same-origin via `src/pages/actas/[file].ts`; linked from
  the match page. See #20. Reworked (2026-10-16) into a bigger **«VER ACTA»** button
  that opens the photo in a modal viewer (see #11). The button is **only rendered when
  `acta_photo_key` is set**, so matches without an uploaded acta show nothing. The
  viewer fixes (2026-10-16): the `<img>` is capped at `max-h-[85dvh] max-w-[92vw]`
  (was a fixed 85dvh×92vw frame that letterboxed photos — now the card hugs the photo),
  and it is `loading="eager"` because a lazy image inside a hidden `<dialog>` may never
  load. Clicking the photo's framing area or the backdrop also closes the viewer.
- **"Observaciones / Notas"** — `done` (2026-10-14). `matches.observations`, rendered
  on the match page. See #20. Moved (2026-10-16) below the player stats + quarter chart.
- **"Aplazado/Adelantado desde …" badge** — `done` (2026-10-14). Derived from
  `matches.original_date` vs `matches.date`. See #20. Reworked (2026-10-15) to
  `Aplazado <fecha original> → <fecha nueva>` via the shared `MovedBadge.astro` /
  `movedLabel()` and also shown on Calendario/Inicio match cards (#22). The match
  header now shows the match date between "Jornada N" and the hour.
- **Quarter-by-quarter graph** — promoted to its own item (#11); shipped 2026-10-16.
- **Header layout** — reworked (2026-10-16). "Jornada N" is split out of the
  `date · hour · venue` line into its own Bebas Neue title (`font-display text-3xl`,
  brand red `#641B24`) on its own row above the venue line. Team logos enlarged from
  `sm`/`lg` to `xl` (80px) **in place** — mobile keeps the `logo VS logo` pair on the
  right of the header; the desktop score card keeps its two logos. No logos relocated.

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
  - Applies to: Clasificación + Inicio standings (PJ/V/D/E/NP/PF/PC/±/PTS/RACHA), Jugadores
    (PJ), Equipos/`[id]` roster (PJ/Pts·PJ/2P/3P/TL%), Partido/`[id]` box score
    (P/2P/3P/TL/TLI/Fal).

### 11. Quarter-by-quarter score graph `done` — 2026-10-16

On `/partidos/[id]`, charts the **cumulative** score evolution across `1C..4C` + OT.

- **Data layer.** `getMatch()` and `MatchDetail` (`src/lib/db.ts`) now select the
  period columns; `matchesQuery` stays lean, so Calendario/Inicio do not pay for them.
- **Chart.** New `src/components/QuarterChart.astro` — a single combined hand-rolled
  SVG (no chart dependency), minimalist: one gridline + label every **10** points,
  cumulative polylines with a dot per period, both lines starting from 0 on the Y axis.
  Overtime periods are only added when played, at **half a quarter's X width** (they are
  half the time played), labelled `PR1..PR3`. X labels `1C..4C` match the admin acta.
- **Score tags.** Each plotted point carries the team's running score. The team ahead at
  that quarter gets its tag above the point, the trailing team's below, so the two never
  collide (ties: home above).
- **Colours.** Home red `#B21E2B`, away blue `#1F5FBF` — brightened within the brand
  families so the lines are easy to tell apart. Legend keys are a line with a dot in the
  middle. `role="img"` + descriptive `aria-label`.
- **Placement.** Renders under the player-stats grid and above Observaciones/acta
  (which both moved below the stats). Chart is independent of the box score, so it
  shows whenever quarters exist even if no player stats were entered.
- **Actas.** The acta is a **«VER ACTA»** button (lucide `clipboard-list` inline SVG,
  no icon library) that opens the photo in a **modal viewer** (`<dialog>` +
  `showModal()`): dimmed page via `::backdrop`, round × close, ESC and
  click-outside-to-close. Replaced the earlier new-tab link.
- **Dropped from the original idea:** the `1 2 3 4 | PR | Final` scoreboard (the per-point
  score tags cover it) and the view selector (score differential vs both scores). Still
  unlocked later: 4th-quarter comebacks, per-quarter averages, largest lead.

### 12. Master data is seeded, not imported `done` — 2026-10-10

- Teams renamed in D1; `players` seeded with the real roster — dorsals `1..N` per team,
  `year` (birth year) via `migrations/0005_add_players_year.sql` and
  `scripts/seed-roster.mjs` (local + remote in sync).
- Grayos roster corrected (2026-10-10): `Fernando Marco López` (id 1226) replaced in place
  by `Jaime Marco Requena` (#3, games carried over); `Badre Kadi El Megroud` (#0) and
  `Jorge Monge Valiente` (#1) added with no `match_stats` (render as 0 PJ); `D'Angelo`
  capitalization normalized (`scripts/grayos-roster-update.sql`).
- `teams.logo_url` written for Emerge (id 1) and Grayos (id 4), served from R2 via the
  `MEDIA` binding (`src/pages/logos/[file].ts`, `migrations/0006_seed_team_logos.sql`);
  Chino Hills / Ruskiñol / Totonto in `0009`. `TeamBadge.astro` renders the logo or falls
  back to palette initials. See the R2 section in `docs/deploy.md`.
- Master data (teams, players, venues) is edited directly in D1; the admin panel does not
  create teams/players. A rename must be done in the DB, not the app.
- **Superseded:** the old sheet/importer lookup design notes were dropped with the
  Excel→SQL path (see "Dropped").

### 16. UI/PWA polish `planned`

- Navbar: gradient treatment for the status area + general navbar fixes.
- Footer color change.
- Bottom safe-area padding for PWA — text clipped at screen borders
  (viewport/`env(safe-area-inset-bottom)` issue).
- Fix the installed-PWA home-screen logo on Android (manifest icons / maskable icon
  issue). *(merged from the former #18)*
- Pull-to-refresh (custom, 2026-10-16) — `src/lib/pull-to-refresh.ts` + indicator markup
  in `Layout.astro`/`AdminLayout.astro` + styles in `global.css`. Standalone-only
  (or a `?ptr=1` dev override), touch-only. The page content stays still; a brand
  basketball emerges from under the bottom edge of the header and travels down to a
  third of the viewport height as you pull, releasing past ~70px reloads. Enabled on all
  public pages (via `Layout`) and `/admin/dashboard` (via the `pullToRefresh` prop on
  `AdminLayout`); other admin pages are untouched.

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

### 19. Match venue ("Lugar") `done` — implemented as the `venues` table (#20)

- Every match records the court it is played at. **Decision changed:** implemented as a
  `venues` table (`migrations/0011_create_venues.sql`) with `matches.venue_id` FK
  (`0012_extend_matches.sql`), not a `place TEXT` + `src/lib/places.ts` enum.
- 5 venues seeded (`scripts/seed-calendar.sql`), each with a Google Maps URL; getters in
  `src/lib/db.ts` (`getVenues`). Editable by admins in the Jornadas schedule board (#20).
- Public surfacing `done` (2026-10-15): `MatchRow`/`MatchDetail` join `venues`
  (`venue_name`/`venue_short`/`venue_maps`). `src/components/VenueLink.astro` renders the
  sede name as a Google Maps link (full name on ≥sm, `short_name` on mobile). The match
  page shows it after the time, separated by `·` alongside Jornada/hour. Match cards
  (Inicio + Calendario) pin the venue to the top-right corner as a Maps link; the card is
  a wrapper `<div>` with a transparent overlay link to the match (so the venue link and
  the match link are not nested).
- TBD venue (2026-10-15): `migrations/0016_tbd_venue.sql` adds a `Por determinar` venue
  (no `maps_url`) and points all `scheduled` matches at it — future games default to
  «Por determinar» until an admin sets the real venue. `VenueLink.astro` renders venues
  without a `maps_url` in italic Bebas Neue, and venues with a link show a small Lucide
  `map` icon after the name to hint it opens Maps.
- Times wiped for jornadas 2+ (2026-10-15, `migrations/0017_wipe_future_times.sql`) —
  times not confirmed yet; public UI renders nothing (no placeholder, no date fallback)
  where a time is missing. Admins set times per match via the schedule board.

### 20. Admin panel — auth, actas, jornadas `done` — built 2026-10-14, deployed 2026-10-15

Password-protected area at `/admin`. Deployed: **yes**
(2026-10-15) — remote migrations applied via CI and the `ADMIN_USERS` secret set on the
`lle-pwa` Worker. Routes are network-only in the service worker (`public/sw.js`,
`VERSION` → `lle-v5`). Linked from the public header since 2026-10-16: `Nav.astro` ends
with a lucide `shield-cog-corner` icon link to `/admin`, visible at all breakpoints.

- **Auth (custom, replaces Cloudflare Access for this).** `src/lib/auth.ts` +
  `migrations/0013_admin_auth.sql` (`admin_sessions`, `login_attempts`; user records
  come from the `ADMIN_USERS` secret, not a DB table): PBKDF2-SHA256
  per-user salt, constant-time compare, 5-failure/15-min lockout, sliding 1 h idle +
  8 h absolute sessions (`lle_admin` cookie, HttpOnly/SameSite=Strict, `Secure` only on
  https). Users from the `ADMIN_USERS` secret (`.dev.vars` locally,
  `scripts/gen-users.mjs`). Roles: `admin` and `referee`; middleware blocks referees
  from `jornadas` pages and the schedule/postpone APIs. `Cache-Control: no-store` +
  `X-Robots-Tag: noindex, nofollow`.
- **Actas.** `admin/actas/*` + `components/admin/ActaForm.tsx` (React island) +
  `api/admin/matches/[id]/results.ts`. Validates via one shared plain-TS module
  (`src/lib/validation/match-acta.ts`): quarters+OT sum to final, player points sum to
  team total, roster membership, fouls (≤5), TLI ≥ TLA, ties allowed (1 pt each, #23),
  forfeit → 20-0 with
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
- **Dashboard (`admin/dashboard.astro`).** Jornadas table consolidated to three
  columns (`Jornada · Fechas · Registrados`, 2026-10-16) so it fits narrow phones.
  The old Registrados/Pendientes/Actas columns merged into one: `N/4` + a lucide
  `clipboard-pen` icon inside a link to `/admin/actas/{week}`, tinted amber when
  actas are pending and green when complete (pending signal kept via colour +
  `title`/`aria-label`).
- **Jornadas.** `admin/jornadas/cambiar.astro` + `components/admin/ScheduleBoard.tsx`:
  edit date/time/venue and postpone. `matches.venue_id` (§#19), plus
  `observations`, `acta_photo_key`, `original_date` (`0012_extend_matches.sql`).
  `original_date` drives the "Aplazado/Adelantado" badge (§#8). Conflict detection
  (`api/admin/jornadas/conflicts.ts`, `getTeamConflicts`/`getVenueConflicts`/
  `getAvailableRainDates`) — **hard blocks** (409): a change that double-books a team
  or a venue/time is rejected; the UI disables confirm while conflicts exist. Rain-date
  suggestions come from `special_dates` (`0014_special_dates.sql`).
- **Local data.** Migrations `0010` (rewritten FK-safe) through `0015` (real 2026/27
  calendar) applied to local D1; `scripts/seed-calendar.sql` seeded 56 matches / 105
  players / 5 venues / 20 special dates (match ids 109–164). `0015_seed_calendar.sql`
  carries the same calendar so CI loads it into the remote DB.
- **Remote (2026-10-15).** Migrations `0010`–`0015` applied to remote D1 via CI; the real
  calendar is live (56 matches / 8 standings rows / 0 stats). `ADMIN_USERS` secret set on
  the `lle-pwa` Worker and production login verified. `/admin/login` redirects to
  `/admin` (`src/pages/admin/login.astro`).
- **Back to public app (2026-10-16).** The login page (`admin/index.astro`) shows a
  «Volver a Inicio» button («Volver a App» on mobile, `<sm`) → `/` below the card, and
  `api/admin/logout.ts` now 303-redirects to `/` (was `/admin`) so «Cerrar sesión» lands
  on the public main app. Decided: **no**
  back-link in the `AdminLayout` header — leaving the panel to the public site happens via
  logout only.
- **Mobile pass.** Confirmed OK on the phone (2026-10-15). The exposed admin passwords
  are intentionally kept for now (decided) — rotation is a future follow-up.
- **Status: complete.** The Excel→SQL path that this panel replaced is dropped (see
  "Dropped").

### 21. New / future seasons — historic results + edit only the current season `deferred` — research before next season

The schema is single-season. `matches` has no season marker and `week` restarts at 1 each
season, so `UNIQUE(week, home_team_id, away_team_id)` (`0001_create_schema.sql`) collides
the moment a second season is loaded; `standings` holds one cumulative row per team; and
the week helpers (`getLatestWeek`, `getLastPlayedWeek`, `getUpcomingWeek`,
`src/lib/db.ts:142-168`) query `MAX/MIN(week)` with no season filter.

**Goals.**

- Load a new season without colliding with or overwriting past results.
- Keep historic results intact.
- Restrict all admin writes (actas, jornadas) to the current season.
- Per-season standings and leaderboards.

**Decisions (2026-10-15).**

- Add a `seasons` table (`id`, `label` e.g. `2026/27`, `start_date`, `end_date`,
  active/`is_current`) + `matches.season_id` FK; rebuild `matches` →
  `UNIQUE(season_id, week, home_team_id, away_team_id)` (SQLite rebuild, like `0010`).
- **Players stay global** (`players` unchanged); season scoping comes entirely from
  `matches.season_id`; stats remain per match.
- `standings` keyed by `(season_id, team_id)`, recomputed per season.
- Admin derives the current season from `seasons` and **rejects writes to non-current
  seasons**.
- Public: normal pages (Inicio/Calendario/Clasificación/Estadísticas) show the **current
  season**; past seasons live in a separate **archived, read-only "Histórico" section**
  (no per-page season switcher).
- Migration backfills the existing 56-match calendar into the first season.

**Open questions.**

- Standings stored per season vs. computed from matches.
- Whether the Estadísticas leaderboards (#1) are per-season too.

### 22. Postponed matches in the calendar — "Jornada aplazada" `done` — 2026-10-15

On `/calendario`, matches moved to a **rain/reserved `special_dates` date**
(`type='lluvia'`, `detail='LLUVIA/APLAZADO'`) are pulled out of their normal
`Jornada N` section into a **"Jornada aplazada"** section, one per distinct date,
placed chronologically between the surrounding jornadas (e.g. a game moved to
2026-12-19 sits between Jornada 7 and Jornada 8). Non-special-date moves stay in
their `Jornada N` (with the badge); jornada headers show a date range when they
span more than one date.

- `MatchRow` now carries `original_date` (`src/lib/db.ts`, `matchesQuery`).
- Shared badge/label: `src/components/MovedBadge.astro` + `movedLabel()`
  (`src/lib/format.ts`), reused by the match page and `MatchGrid.astro` cards.

### 23. Tied games — "empates" `done` — 2026-10-16

A match may now finish tied. Decided 2026-10-16:

- **Rules.** A tie is allowed at any point — even after regulation, no overtime required
  (the old validation rule "no puede acabar en empate: añade prórroga" is removed from
  `src/lib/validation/match-acta.ts`). League points stay **V=2, D=1, E=1**, so a tie
  awards the same league points as a loss; only the V–E–D record and +/- differ.
  Overtime symmetry (both teams record the same number of OTs) still applies.
- **Schema.** `migrations/0018_add_standings_ties.sql`: `standings.ties` (default 0).
  No backfill needed (no ties existed; all matches were `scheduled`).
- **Computation** (`src/lib/db.ts`): `recomputeStandings()` gained a tie branch
  (both teams `ties++`, `points += 1`). Before this, a tied `finished` match would have
  credited **0 points to both** teams. `getStandings()` form badges gained `'T'` (a tie
  previously rendered as two `L`); `getTeams()`/`getTeam()` select `ties`.
- **Admin acta.** `ActaForm.tsx` no longer shows the red tie error; when the totals are
  equal it shows an amber informational note «Empate — cada equipo sumará 1 punto de liga».
- **Public UI.** New **E** column (amber, tooltip «Empates») after D on Clasificación
  and the Inicio mini-table (sortable `data-colN` renumbered); RACHA badge `T` =
  amber-400; `equipos` card «XV–YE–ZD»; `equipos/[id]` «… empates …».
- **ScoreBadge.** Tied scorelines get a neutral outline (`border-gray-400` card /
  `border-white/40` hero) and a stacked «EMPATE» label (`src/components/ScoreBadge.astro`).
- **Tiebreakers unchanged:** PTS → +/- → PF (no head-to-head; revisit if tied teams
  collide often).

### 24. Pre-structured turno times + single-court venue conflicts `done` — 2026-10-17

Future jornadas now carry a provisional turno time before venues/kick-offs are
confirmed, and the admin conflict check respects venue capacity.

- **Data.** `migrations/0020_seed_turno_times.sql` fills `time` for weeks 2–14
  (52 matches) with the four turnos — T1 `08:30`, T2 `10:00`, T3 `11:30`,
  T4 `13:00` — following the league workbook turno order. Guarded by
  `status='scheduled' AND time IS NULL`, so it never overwrites an admin edit.
  Jornada 1 is untouched. The two moved games keep their new-date turno
  (19-dic = T3, 13-feb = T1).
- **UI.** `formatTurno()` in `src/lib/format.ts` maps those hours to
  `1er Turno` / `2o Turno` / `3er Turno` / `4o Turno`, with every ordinal suffix
  (`er`, `o`) rendered as a `<sup>` (the helper returns trusted HTML, rendered
  via `set:html`). When the venue has no `maps_url` (`isTbdVenue`, i.e. "Por
  determinar") the cards (`MatchGrid.astro`) and the `/partidos/[id]` headers
  show the turno label instead of the hour; any other time falls back to
  `formatTime()`.
- **Ordering.** `getAllMatches()` (Calendario) and `getWeekMatches()` /
  `getMatchesByWeek()` (Inicio, admin board) now sort by
  `date ASC, (time IS NULL), time ASC, id ASC`, so grids follow turno order and
  empty slots sink to the bottom.
- **Venue capacity.** `migrations/0019_venues_single_court.sql` adds
  `venues.single_court` (default 1). Only **Parque Deportivo**, **Pabellón
  Altet** and **Toscar Exterior** keep 1 and can fire a venue conflict; **Palau
  UMH**, **Toscar Interior** (multi-court pavilions) and **Por determinar**
  (not a real court) are set to 0 and never block. `getVenueConflicts()` checks
  the flag before querying.
- **Accepted trade-off:** two provisional ("Por determinar") games can share the
  same turno without a warning — the guardrail only exists for single-court
  venues. Team clashes (same teams, same date) and special-date warnings are
  unchanged.

---

## Dropped (not doing)

- **#2 Jornada de descanso** — only realizable through the removed Excel→SQL importer
  (`status='rest'` rows).
- **#5 Google Sheet manual entry** — existed only to feed #14.
- **#10 Non-playing `played` column** — sheet-only; the admin acta already enforces
  "a row in `match_stats` = the player played".
- **#13 Prune stale imported rows** — only needed by the removed upsert flow.
- **#14 Excel → SQL import workflow** — replaced by the admin actas (#20).
- **#15 Authenticated SQL-paste endpoint** — tied to pasting SQL; superseded by #20.

---

## Deferred / nice-to-haves (roadmap)

- R2 cloud storage for images (logos, headshots, match photos). **Logos live (2026-10-10)**
  and **acta photos live (2026-10-14)**: bucket `lle-pwa-assets`, `MEDIA` binding,
  same-origin routes `/logos/*` and `/actas/*` with CSP headers (see `docs/deploy.md`).
  Headshots still pending.
- Admin dashboard + login — **built (2026-10-14), deployed (2026-10-15)** as custom auth,
  not Cloudflare Access. See #20.
- Extra stat tracking / schema refinements as the league requires.
- Update README.md

## Open items / not yet decided

- ~~Whether to build an admin dashboard after the MVP (Cloudflare Access or custom auth).~~
  Decided 2026-10-14: custom auth + admin panel built (#20). Cloudflare Access dropped.
- Final D1 schema details (indexes, exact stat columns tracked per player/match). Season
  scoping is tracked as #21.
