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
- Leaderboards (new queries in `src/lib/db.ts`):
  - Puntos (score leaders)
  - Triples (3PM leaders)
  - Tiros libres (FTM / FTA / %)
  - Faltas cometidas
- "Líderes por equipo" view (team aggregates).
- **Excluded:** "fouls recibidos" — the Google Sheet does not record it (confirmed).

### 2. Jornada de descanso `planned` — depends on #5

- A rest week is represented in D1 as a `matches` row with `status='rest'`.
- Import engine must accept/emit `status='rest'` rows; every query/page that filters on
  `'finished' / 'forfeit'` must be audited to handle it.
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

### 5. Google Sheet manual entry — definition pending (me) `blocked`

- Clarify exactly which data needs to be recorded and tracked by the league refs/admins.
- Enumeration that the importer (`src/workers/import/engine.ts`) consumes, for review:
  - Match header (per match, usually repeated per row): week, date, time,
    home_team, away_team, home_score, away_score, status, forfeit_team
  - Per player per match: team, player, number, points, 2pm, 3pm, ftm, fta, fouls
  - Rest weeks as `status='rest'` rows (feeds #2)
- Once the user confirms the recording format, unblock this and update
  `docs/google-sheet.md`.

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

---

## Deferred / nice-to-haves (roadmap)

- R2 cloud storage for images (logos, headshots, match photos) — use repo assets for now.
- Admin dashboard + login (Cloudflare Access if/when built) — no hand-rolled auth.
- Extra stat tracking / schema refinements as the league requires.

## Open items / not yet decided

- Whether to build an admin dashboard after the MVP (Cloudflare Access or custom auth).
- Final D1 schema details (indexes, exact stat columns tracked per player/match).