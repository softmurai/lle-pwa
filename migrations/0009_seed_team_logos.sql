-- Migration number: 0009 	 2026-10-12T00:00:00.000Z

-- Team logos served from R2 (bucket lle-pwa-assets, binding MEDIA) via the
-- /logos/[file] route. Objects: logos/chino.png, logos/ruskinol.svg, logos/totonto.png.
UPDATE teams SET logo_url = '/logos/chino.png'    WHERE id = 3;
UPDATE teams SET logo_url = '/logos/ruskinol.svg' WHERE id = 7;
UPDATE teams SET logo_url = '/logos/totonto.png'  WHERE id = 8;
