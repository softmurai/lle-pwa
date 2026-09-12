-- Migration number: 0003 	 2026-09-12T15:46:35.599Z

ALTER TABLE match_stats DROP COLUMN rebounds;
ALTER TABLE match_stats DROP COLUMN assists;
ALTER TABLE match_stats DROP COLUMN steals;
ALTER TABLE match_stats DROP COLUMN blocks;
ALTER TABLE match_stats DROP COLUMN turnovers;