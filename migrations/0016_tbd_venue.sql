-- Migration number: 0016 	 2026-10-15T00:00:00.000Z
-- "Por determinar" venue used as the default for future/unconfirmed games.
-- No maps_url, so the UI renders it in italic Bebas Neue without a map icon.

INSERT INTO venues (name, short_name, maps_url) VALUES
  ('Por determinar', 'Por determinar', NULL);

UPDATE matches SET venue_id = (SELECT id FROM venues WHERE name = 'Por determinar')
WHERE status = 'scheduled';
