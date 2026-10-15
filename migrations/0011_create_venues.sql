-- Migration number: 0011 	 2026-10-14T00:00:00.000Z

CREATE TABLE IF NOT EXISTS venues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  short_name TEXT NOT NULL,
  maps_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO venues (name, short_name, maps_url) VALUES
  ('Parque Deportivo', 'Parque', 'https://maps.app.goo.gl/AyHSF5YUoX7yp8ag9'),
  ('Palau UMH', 'UMH', 'https://maps.app.goo.gl/y5zKwmHNY5Dwd2Nm6'),
  ('Toscar Interior', 'Toscar Int.', 'https://maps.app.goo.gl/EduheFcHNChSxtiKA'),
  ('Toscar Exterior', 'Toscar Ext.', 'https://maps.app.goo.gl/ca7QvLJciPxa293S8'),
  ('Pabellón Altet', 'Altet', 'https://maps.app.goo.gl/7mtbqhzFnqbnL8er8');
