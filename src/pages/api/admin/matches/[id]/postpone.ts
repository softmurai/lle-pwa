import type { APIRoute } from 'astro';
import {
	applyScheduleChange,
	getAdminMatch,
	getTeamConflicts,
	getVenueConflicts,
} from '../../../../../lib/db';

export const prerender = false;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export const POST: APIRoute = async ({ params, request }) => {
	const matchId = Number.parseInt(params.id ?? '', 10);
	if (!Number.isInteger(matchId)) return json({ error: 'ID inválido' }, 400);

	const match = await getAdminMatch(matchId);
	if (!match) return json({ error: 'Partido no encontrado' }, 404);

	let body: { date?: string; time?: string | null; venueId?: number | null };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Cuerpo inválido' }, 400);
	}

	const date = body.date ?? '';
	if (!DATE_RE.test(date)) return json({ error: 'Fecha inválida' }, 400);

	const time = body.time ? body.time : null;
	if (time && !TIME_RE.test(time)) return json({ error: 'Hora inválida' }, 400);

	const venueId = body.venueId == null ? null : Number(body.venueId);

	// Conflicts hard-block: the match cannot be moved onto a date where either
	// team already plays or the venue/time is taken.
	const [teamConflicts, venueConflicts] = await Promise.all([
		getTeamConflicts(matchId, match.home_id, match.away_id, date),
		getVenueConflicts(matchId, venueId, date, time),
	]);
	if (teamConflicts.length || venueConflicts.length) {
		return json(
			{
				error: 'La nueva fecha tiene conflictos',
				teamConflicts,
				venueConflicts,
			},
			409,
		);
	}

	await applyScheduleChange(matchId, { date, time, venue_id: venueId });
	return json({ ok: true });
};

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
	});
}
