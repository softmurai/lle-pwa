-- Migration number: 0002 	 2026-09-12T14:58:25.040Z

ALTER TABLE match_stats DROP COLUMN minutes;
ALTER TABLE match_stats DROP COLUMN field_goals_attempted;
ALTER TABLE match_stats DROP COLUMN three_pt_attempted;