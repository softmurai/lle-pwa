-- Migration number: 0021 	 2026-10-19T00:00:00.000Z
-- New venue: La Marina.
--
-- single_court = 1 -> the venue has a single court, so it can only host one
--                     game per date + time. Same guardrail as Parque Deportivo,
--                     Pabellón Altet and Toscar Exterior.

INSERT INTO venues (name, short_name, maps_url, single_court) VALUES
  ('La Marina', 'Marina', 'https://maps.app.goo.gl/eKBQq1jPWtfQdyoK9', 1);
