-- Migration number: 0006 	 2026-10-10T00:00:00.000Z

UPDATE teams SET logo_url = '/logos/emerge.svg' WHERE id = 1;
UPDATE teams SET logo_url = '/logos/grayos.svg' WHERE id = 4;