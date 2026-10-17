-- Migration number: 0019 	 2026-10-17T00:00:00.000Z
-- Venue capacity flag used by the admin conflict check.
--
-- single_court = 1 -> the venue has a single court, so two matches cannot share
--                     the same date + time there (Parque Deportivo, Pabellón
--                     Altet, Toscar Exterior).
-- single_court = 0 -> multi-court pavilion (Palau UMH, Toscar Interior) or the
--                     "Por determinar" placeholder, which is not a real court.
--                     These never fire a venue conflict.
--
-- Defaults to 1 so any venue added later is treated as single-court (a warning
-- is safer than a silent double-booking).

ALTER TABLE venues ADD COLUMN single_court INTEGER NOT NULL DEFAULT 1;

UPDATE venues SET single_court = 0
WHERE name IN ('Palau UMH', 'Toscar Interior', 'Por determinar');
