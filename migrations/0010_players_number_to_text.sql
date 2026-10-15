-- Migration number: 0010 	 2026-10-13T00:00:00.000Z
-- Rebuild players so `number` becomes TEXT (preserving leading zeros / non-numeric
-- labels). match_stats has an FK to players, so it is rebuilt in lockstep. D1
-- checks foreign keys per statement, so every intermediate step keeps children
-- valid: match_stats is stashed into a constraint-free copy, dropped, the parent
-- is swapped, and match_stats is recreated with its FKs before reloading data.

CREATE TABLE players_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  name TEXT NOT NULL,
  number TEXT,
  position TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  year INTEGER,
  UNIQUE (team_id, name, number)
);

INSERT INTO players_new (id, team_id, name, number, position, created_at, year)
SELECT id, team_id, name, CAST(number AS TEXT), position, created_at, year
FROM players;

CREATE TABLE match_stats_bak AS SELECT * FROM match_stats;
DROP TABLE match_stats;
DROP TABLE players;

ALTER TABLE players_new RENAME TO players;

CREATE TABLE match_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL REFERENCES matches(id),
  player_id INTEGER NOT NULL REFERENCES players(id),
  points INTEGER NOT NULL DEFAULT 0,
  fouls INTEGER NOT NULL DEFAULT 0,
  field_goals_made INTEGER NOT NULL DEFAULT 0,
  three_pt_made INTEGER NOT NULL DEFAULT 0,
  free_throws_made INTEGER NOT NULL DEFAULT 0,
  free_throws_attempted INTEGER NOT NULL DEFAULT 0,
  UNIQUE (match_id, player_id)
);

INSERT INTO match_stats
  (id, match_id, player_id, points, fouls, field_goals_made, three_pt_made, free_throws_made, free_throws_attempted)
SELECT id, match_id, player_id, points, fouls, field_goals_made, three_pt_made, free_throws_made, free_throws_attempted
FROM match_stats_bak;

DROP TABLE match_stats_bak;

CREATE INDEX idx_players_team ON players (team_id);
CREATE INDEX idx_match_stats_match ON match_stats (match_id);
CREATE INDEX idx_match_stats_player ON match_stats (player_id);
