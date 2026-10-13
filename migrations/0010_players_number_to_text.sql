-- Migration number: 0010 	 2026-10-13T00:00:00.000Z
PRAGMA foreign_keys=OFF;

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

DROP TABLE players;
ALTER TABLE players_new RENAME TO players;

CREATE INDEX idx_players_team ON players (team_id);

PRAGMA foreign_keys=ON;
