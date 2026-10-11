-- Migration number: 0008 	 2026-10-12T00:00:00.000Z

-- Ruskiñol: update squad numbers for existing players.
-- No match_stats changes, so existing stats are preserved.
UPDATE players SET number = 43 WHERE team_id = (SELECT id FROM teams WHERE short_name = 'Ruskiñol') AND name = 'Alejandro Gangoso Rives';
UPDATE players SET number = 5  WHERE team_id = (SELECT id FROM teams WHERE short_name = 'Ruskiñol') AND name = 'Benigno Alberto López Sánchez';
UPDATE players SET number = 10 WHERE team_id = (SELECT id FROM teams WHERE short_name = 'Ruskiñol') AND name = 'Cristian Óscar Pérez Bonifacio';
UPDATE players SET name = 'Cristian Plaza Masegosa', number = 7 WHERE team_id = (SELECT id FROM teams WHERE short_name = 'Ruskiñol') AND name = 'Cristián Plaza Masegosa';
UPDATE players SET number = 32 WHERE team_id = (SELECT id FROM teams WHERE short_name = 'Ruskiñol') AND name = 'Ángel Fernando Román Recio';
UPDATE players SET number = 11 WHERE team_id = (SELECT id FROM teams WHERE short_name = 'Ruskiñol') AND name = 'Ferran Oliver Candela';
UPDATE players SET number = 6  WHERE team_id = (SELECT id FROM teams WHERE short_name = 'Ruskiñol') AND name = 'Gaspar Valero Amat';
UPDATE players SET number = 77 WHERE team_id = (SELECT id FROM teams WHERE short_name = 'Ruskiñol') AND name = 'Iván Castillo Simón';
UPDATE players SET number = 93 WHERE team_id = (SELECT id FROM teams WHERE short_name = 'Ruskiñol') AND name = 'José Antonio Marín Padilla';
UPDATE players SET number = 4  WHERE team_id = (SELECT id FROM teams WHERE short_name = 'Ruskiñol') AND name = 'Manuel Bernal Sáez';
UPDATE players SET number = 1  WHERE team_id = (SELECT id FROM teams WHERE short_name = 'Ruskiñol') AND name = 'Miguel Ángel Plazas López';
UPDATE players SET number = 54 WHERE team_id = (SELECT id FROM teams WHERE short_name = 'Ruskiñol') AND name = 'Ignacio Iván Tavarozzi';
UPDATE players SET number = 28 WHERE team_id = (SELECT id FROM teams WHERE short_name = 'Ruskiñol') AND name = 'Sergio Pomares Quirant';
UPDATE players SET number = 13 WHERE team_id = (SELECT id FROM teams WHERE short_name = 'Ruskiñol') AND name = 'José Alarcón García';
UPDATE players SET number = 99 WHERE team_id = (SELECT id FROM teams WHERE short_name = 'Ruskiñol') AND name = 'Samuel Pavón De La Peña';
UPDATE players SET number = 9  WHERE team_id = (SELECT id FROM teams WHERE short_name = 'Ruskiñol') AND name = 'Sergio Boix Castillo';
UPDATE players SET number = 23 WHERE team_id = (SELECT id FROM teams WHERE short_name = 'Ruskiñol') AND name = 'Francisco López Sánchez';

-- Ruskiñol: add three players (no year, no match_stats rows).
INSERT INTO players (team_id, name, number, year) VALUES
  ((SELECT id FROM teams WHERE short_name = 'Ruskiñol'), 'Francisco Sánchez Pastor', 14, NULL),
  ((SELECT id FROM teams WHERE short_name = 'Ruskiñol'), 'Daniel García Francés', 12, NULL),
  ((SELECT id FROM teams WHERE short_name = 'Ruskiñol'), 'José Andrés Barreto Fernández', 33, NULL);
