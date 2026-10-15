-- Migration number: 0012 	 2026-10-14T00:00:00.000Z
-- Admin editing: venue, reschedule provenance, per-quarter + overtime scores,
-- observations and the R2 key of the uploaded acta photo.

ALTER TABLE matches ADD COLUMN venue_id INTEGER REFERENCES venues(id);
ALTER TABLE matches ADD COLUMN original_date TEXT;

ALTER TABLE matches ADD COLUMN home_q1 INTEGER;
ALTER TABLE matches ADD COLUMN home_q2 INTEGER;
ALTER TABLE matches ADD COLUMN home_q3 INTEGER;
ALTER TABLE matches ADD COLUMN home_q4 INTEGER;
ALTER TABLE matches ADD COLUMN away_q1 INTEGER;
ALTER TABLE matches ADD COLUMN away_q2 INTEGER;
ALTER TABLE matches ADD COLUMN away_q3 INTEGER;
ALTER TABLE matches ADD COLUMN away_q4 INTEGER;

ALTER TABLE matches ADD COLUMN home_ot1 INTEGER;
ALTER TABLE matches ADD COLUMN home_ot2 INTEGER;
ALTER TABLE matches ADD COLUMN home_ot3 INTEGER;
ALTER TABLE matches ADD COLUMN away_ot1 INTEGER;
ALTER TABLE matches ADD COLUMN away_ot2 INTEGER;
ALTER TABLE matches ADD COLUMN away_ot3 INTEGER;

ALTER TABLE matches ADD COLUMN observations TEXT;
ALTER TABLE matches ADD COLUMN acta_photo_key TEXT;

CREATE INDEX IF NOT EXISTS idx_matches_status ON matches (status);
