-- Migration number: 0018 	 2026-10-16T00:00:00.000Z
-- Tied games: each team gets 1 league point. Recorded separately from wins/losses.

ALTER TABLE standings ADD COLUMN ties INTEGER NOT NULL DEFAULT 0;
