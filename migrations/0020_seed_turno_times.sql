-- Migration number: 0020 	 2026-10-17T00:00:00.000Z
-- Pre-structured turno schedule for the remaining jornadas (2..14).
--
-- Turn 1 -> 08:30, Turn 2 -> 10:00, Turn 3 -> 11:30, Turn 4 -> 13:00.
-- Turno order follows the league workbook; the two rescheduled matches keep the
-- turno of their new date (19-dic = Turno 3, 13-feb = Turno 1).
--
-- Venues are still unconfirmed ("Por determinar") and the week of the game will
-- be updated with the real time/venue from the admin page. `time IS NULL`
-- guards the migration so it can never overwrite an admin-edited time.
-- Jornada 1 is already played and is intentionally left untouched.

-- Turno 1 · 08:30
UPDATE matches SET time = '08:30'
WHERE status = 'scheduled'
  AND time IS NULL
  AND week BETWEEN 2 AND 14
  AND (week, home_team_id, away_team_id) IN (
    (2, 2, 6),
    (3, 8, 6),
    (4, 4, 8),
    (5, 7, 2),
    (6, 1, 3),
    (7, 4, 6),
    (8, 3, 7),
    (9, 5, 1),
    (10, 7, 4),
    (11, 7, 5),
    (12, 6, 3),
    (13, 8, 5),
    (14, 5, 2)
  );

-- Turno 2 · 10:00
UPDATE matches SET time = '10:00'
WHERE status = 'scheduled'
  AND time IS NULL
  AND week BETWEEN 2 AND 14
  AND (week, home_team_id, away_team_id) IN (
    (2, 5, 1),
    (3, 7, 4),
    (4, 7, 5),
    (5, 6, 3),
    (6, 4, 2),
    (7, 8, 3),
    (8, 2, 8),
    (9, 3, 4),
    (10, 2, 1),
    (11, 6, 1),
    (12, 1, 8),
    (13, 6, 7),
    (14, 3, 8)
  );

-- Turno 3 · 11:30
UPDATE matches SET time = '11:30'
WHERE status = 'scheduled'
  AND time IS NULL
  AND week BETWEEN 2 AND 14
  AND (week, home_team_id, away_team_id) IN (
    (2, 7, 8),
    (3, 2, 1),
    (4, 2, 3),
    (5, 4, 5),
    (6, 6, 7),
    (7, 5, 2),
    (8, 1, 4),
    (9, 8, 7),
    (10, 6, 8),
    (11, 2, 3),
    (12, 4, 5),
    (13, 1, 3),
    (14, 4, 6)
  );

-- Turno 4 · 13:00
UPDATE matches SET time = '13:00'
WHERE status = 'scheduled'
  AND time IS NULL
  AND week BETWEEN 2 AND 14
  AND (week, home_team_id, away_team_id) IN (
    (2, 3, 4),
    (3, 3, 5),
    (4, 6, 1),
    (5, 8, 1),
    (6, 5, 8),
    (7, 1, 7),
    (8, 5, 6),
    (9, 2, 6),
    (10, 3, 5),
    (11, 8, 4),
    (12, 7, 2),
    (13, 4, 2),
    (14, 1, 7)
  );
