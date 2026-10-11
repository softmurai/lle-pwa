-- Migration number: 0007 	 2026-10-12T00:00:00.000Z

-- Cants: add Victor Campos Garcia (no year) as the next squad number (10).
-- New players get no match_stats rows, so they show as 0 PJ / 0 pts.
INSERT OR IGNORE INTO players (team_id, name, number, year)
VALUES ((SELECT id FROM teams WHERE short_name = 'Cants'), 'Victor Campos Garcia', 10, NULL);

-- Grayos: change Shenhan Zhang's number.
UPDATE players
SET number = 69
WHERE team_id = (SELECT id FROM teams WHERE short_name = 'Grayos')
  AND name = 'Shenhan Zhang';

-- Proballers: rename Anass Nadif and set his year (keeps the id and existing stats).
UPDATE players
SET name = 'Leomar Ramón Domínguez Triana', year = 1985
WHERE team_id = (SELECT id FROM teams WHERE short_name = 'Proballers')
  AND name = 'Anass Nadif';

-- Totonto Raptors: add three players (no match_stats rows).
INSERT OR IGNORE INTO players (team_id, name, number, year) VALUES
  ((SELECT id FROM teams WHERE short_name = 'Totonto'), 'Marcos Montero González', 8, 2005),
  ((SELECT id FROM teams WHERE short_name = 'Totonto'), 'Daniel Antón Antón', 9, 2004),
  ((SELECT id FROM teams WHERE short_name = 'Totonto'), 'Augusto Ruiz Beltrán', 10, 1972);
