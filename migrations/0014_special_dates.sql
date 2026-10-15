-- Migration number: 0014 	 2026-10-14T00:00:00.000Z
-- Special / reserved dates from the calendar workbook (Fechas especiales).
-- `type` drives the warning shown when rescheduling:
--   lluvia   -> reserved for rain postponements (suggested first)
--   festivo  -> public holiday, warn
--   copa     -> cup rounds, warn
--   playoffs -> playoff rounds, warn

CREATE TABLE IF NOT EXISTS special_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  detail TEXT,
  UNIQUE (date, type)
);

INSERT INTO special_dates (date, type, detail) VALUES
  ('2026-10-31', 'festivo', 'FESTIVO'),
  ('2026-12-05', 'festivo', 'FESTIVO'),
  ('2027-03-20', 'festivo', 'FESTIVO'),
  ('2027-03-27', 'festivo', 'FESTIVO'),
  ('2027-05-01', 'festivo', 'FESTIVO'),
  ('2026-12-19', 'lluvia', 'LLUVIA/APLAZADO'),
  ('2027-01-09', 'lluvia', 'LLUVIA/APLAZADO'),
  ('2027-02-13', 'lluvia', 'LLUVIA/APLAZADO'),
  ('2027-04-03', 'lluvia', 'LLUVIA/APLAZADO'),
  ('2027-04-17', 'lluvia', 'LLUVIA/APLAZADO'),
  ('2027-01-16', 'copa', 'CUARTOS COPA'),
  ('2027-01-23', 'copa', 'SEMIS Y FINAL'),
  ('2027-04-24', 'playoffs', 'PLAYOFFS CUARTOS'),
  ('2027-05-08', 'playoffs', 'PLAYOFFS CUARTOS'),
  ('2027-05-15', 'playoffs', 'PLAYOFFS CUARTOS'),
  ('2027-05-22', 'playoffs', 'PLAYOFFS SEMIS'),
  ('2027-05-29', 'playoffs', 'PLAYOFFS SEMIS'),
  ('2027-06-05', 'playoffs', 'PLAYOFFS FINAL'),
  ('2027-06-12', 'playoffs', 'PLAYOFFS FINAL'),
  ('2027-06-19', 'playoffs', 'PLAYOFFS FINAL');
