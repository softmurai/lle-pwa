import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { runImport } from '../../workers/import/engine';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!env.IMPORT_SECRET) {
    return Response.json({ ok: false, error: 'IMPORT_SECRET no configurado' }, { status: 500 });
  }
  if (request.headers.get('x-import-secret') !== env.IMPORT_SECRET) {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 });
  }
  if (!env.IMPORT_CSV_URL) {
    return Response.json({ ok: false, error: 'IMPORT_CSV_URL no configurado' }, { status: 500 });
  }

  const csvRes = await fetch(env.IMPORT_CSV_URL);
  if (!csvRes.ok) {
    return Response.json({ ok: false, error: `No se pudo obtener el CSV (HTTP ${csvRes.status})` }, { status: 502 });
  }
  const csvText = await csvRes.text();
  const report = await runImport(env.lle_pwa, csvText);
  return Response.json(report, { status: report.ok ? 200 : 422 });
};