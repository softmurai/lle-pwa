-- Migration number: 0001 	 2026-09-12T14:46:23.251Z

CREATE TABLE teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  short_name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  name TEXT NOT NULL,
  number INTEGER,
  position TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (team_id, name, number)
);

CREATE TABLE matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week INTEGER NOT NULL,
  date TEXT NOT NULL,
  home_team_id INTEGER NOT NULL REFERENCES teams(id),
  away_team_id INTEGER NOT NULL REFERENCES teams(id),
  home_score INTEGER,
  away_score INTEGER,
  status TEXT NOT NULL DEFAULT 'finished',
  UNIQUE (week, home_team_id, away_team_id)
);

CREATE TABLE match_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL REFERENCES matches(id),
  player_id INTEGER NOT NULL REFERENCES players(id),
  points INTEGER NOT NULL DEFAULT 0,
  rebounds INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  steals INTEGER NOT NULL DEFAULT 0,
  blocks INTEGER NOT NULL DEFAULT 0,
  turnovers INTEGER NOT NULL DEFAULT 0,
  fouls INTEGER NOT NULL DEFAULT 0,
  minutes INTEGER NOT NULL DEFAULT 0,
  field_goals_made INTEGER NOT NULL DEFAULT 0,
  field_goals_attempted INTEGER NOT NULL DEFAULT 0,
  three_pt_made INTEGER NOT NULL DEFAULT 0,
  three_pt_attempted INTEGER NOT NULL DEFAULT 0,
  free_throws_made INTEGER NOT NULL DEFAULT 0,
  free_throws_attempted INTEGER NOT NULL DEFAULT 0,
  UNIQUE (match_id, player_id)
);

CREATE TABLE standings (
  team_id INTEGER PRIMARY KEY REFERENCES teams(id),
  played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  points_for INTEGER NOT NULL DEFAULT 0,
  points_against INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_matches_week ON matches (week);
CREATE INDEX idx_matches_date ON matches (date);
CREATE INDEX idx_matches_home_team ON matches (home_team_id);
CREATE INDEX idx_matches_away_team ON matches (away_team_id);
CREATE INDEX idx_players_team ON players (team_id);
CREATE INDEX idx_match_stats_match ON match_stats (match_id);
CREATE INDEX idx_match_stats_player ON match_stats (player_id);