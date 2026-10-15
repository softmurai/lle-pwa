-- Migration number: 0015 	 2026-10-15T00:00:00.000Z
-- Real 2026/27 season calendar (56 matches, 14 jornadas), replacing the mock
-- fixtures. Two matches are already moved from their original date
-- (aplazado / adelantado). All matches share venue_id = 1 (Parque Deportivo);
-- venues themselves are seeded by 0011_create_venues.sql. Runs once per database.
-- Mirror of scripts/seed-calendar.sql (kept in sync for local/dev use).

DELETE FROM match_stats;
DELETE FROM matches;
DELETE FROM standings;

INSERT INTO matches (week, date, time, venue_id, home_team_id, away_team_id, status, original_date) VALUES
(1, '2026-10-17', '08:30', 1, 1, 4, 'scheduled', NULL),
(1, '2026-10-17', '11:00', 1, 5, 6, 'scheduled', NULL),
(1, '2026-10-17', '12:30', 1, 3, 7, 'scheduled', NULL),
(1, '2026-10-17', '13:00', 1, 8, 2, 'scheduled', NULL),
(2, '2026-10-24', '08:30', 1, 2, 6, 'scheduled', NULL),
(2, '2026-10-24', '11:00', 1, 5, 1, 'scheduled', NULL),
(2, '2026-10-24', '12:30', 1, 7, 8, 'scheduled', NULL),
(2, '2026-10-24', '13:00', 1, 3, 4, 'scheduled', NULL),
(3, '2026-11-07', '08:30', 1, 8, 6, 'scheduled', NULL),
(3, '2026-11-07', '11:00', 1, 7, 4, 'scheduled', NULL),
(3, '2026-11-07', '12:30', 1, 2, 1, 'scheduled', NULL),
(3, '2026-11-07', '13:00', 1, 3, 5, 'scheduled', NULL),
(4, '2026-11-14', '08:30', 1, 4, 8, 'scheduled', NULL),
(4, '2026-11-14', '11:00', 1, 7, 5, 'scheduled', NULL),
(4, '2026-11-14', '12:30', 1, 2, 3, 'scheduled', NULL),
(4, '2026-11-14', '13:00', 1, 6, 1, 'scheduled', NULL),
(5, '2026-11-21', '08:30', 1, 7, 2, 'scheduled', NULL),
(5, '2026-11-21', '11:00', 1, 6, 3, 'scheduled', NULL),
(5, '2026-11-21', '12:30', 1, 4, 5, 'scheduled', NULL),
(5, '2026-11-21', '13:00', 1, 8, 1, 'scheduled', NULL),
(6, '2026-11-28', '08:30', 1, 1, 3, 'scheduled', NULL),
(6, '2026-11-28', '11:00', 1, 4, 2, 'scheduled', NULL),
(6, '2026-12-19', '12:30', 1, 6, 7, 'scheduled', '2026-11-28'),
(6, '2026-11-28', '13:00', 1, 5, 8, 'scheduled', NULL),
(7, '2026-12-12', '08:30', 1, 4, 6, 'scheduled', NULL),
(7, '2026-12-12', '11:00', 1, 8, 3, 'scheduled', NULL),
(7, '2026-12-12', '12:30', 1, 5, 2, 'scheduled', NULL),
(7, '2026-12-12', '13:00', 1, 1, 7, 'scheduled', NULL),
(8, '2027-01-30', '08:30', 1, 3, 7, 'scheduled', NULL),
(8, '2027-01-30', '11:00', 1, 2, 8, 'scheduled', NULL),
(8, '2027-01-30', '12:30', 1, 1, 4, 'scheduled', NULL),
(8, '2027-01-30', '13:00', 1, 5, 6, 'scheduled', NULL),
(9, '2027-02-06', '08:30', 1, 5, 1, 'scheduled', NULL),
(9, '2027-02-06', '11:00', 1, 3, 4, 'scheduled', NULL),
(9, '2027-02-06', '12:30', 1, 8, 7, 'scheduled', NULL),
(9, '2027-02-06', '13:00', 1, 2, 6, 'scheduled', NULL),
(10, '2027-02-13', '08:30', 1, 7, 4, 'scheduled', '2027-02-20'),
(10, '2027-02-20', '11:00', 1, 2, 1, 'scheduled', NULL),
(10, '2027-02-20', '12:30', 1, 6, 8, 'scheduled', NULL),
(10, '2027-02-20', '13:00', 1, 3, 5, 'scheduled', NULL),
(11, '2027-02-27', '08:30', 1, 7, 5, 'scheduled', NULL),
(11, '2027-02-27', '11:00', 1, 6, 1, 'scheduled', NULL),
(11, '2027-02-27', '12:30', 1, 2, 3, 'scheduled', NULL),
(11, '2027-02-27', '13:00', 1, 8, 4, 'scheduled', NULL),
(12, '2027-03-06', '08:30', 1, 6, 3, 'scheduled', NULL),
(12, '2027-03-06', '11:00', 1, 1, 8, 'scheduled', NULL),
(12, '2027-03-06', '12:30', 1, 4, 5, 'scheduled', NULL),
(12, '2027-03-06', '13:00', 1, 7, 2, 'scheduled', NULL),
(13, '2027-03-13', '08:30', 1, 8, 5, 'scheduled', NULL),
(13, '2027-03-13', '11:00', 1, 6, 7, 'scheduled', NULL),
(13, '2027-03-13', '12:30', 1, 1, 3, 'scheduled', NULL),
(13, '2027-03-13', '13:00', 1, 4, 2, 'scheduled', NULL),
(14, '2027-04-10', '08:30', 1, 5, 2, 'scheduled', NULL),
(14, '2027-04-10', '11:00', 1, 3, 8, 'scheduled', NULL),
(14, '2027-04-10', '12:30', 1, 4, 6, 'scheduled', NULL),
(14, '2027-04-10', '13:00', 1, 1, 7, 'scheduled', NULL);

INSERT INTO standings (team_id, played, wins, losses, points_for, points_against, points)
SELECT id, 0, 0, 0, 0, 0, 0 FROM teams;
