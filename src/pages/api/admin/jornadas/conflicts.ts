import type { APIRoute } from 'astro';
import {
	getAdminMatch,
	getAvailableRainDates,
	getSpecialDates,
	getTeamConflicts,
	getVenueConflicts,
} from '../../../../lib/db';

export const prerender = false;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const POST: APIRoute = async ({ request }) => {
	let body: { matchId?: number; date?: string; time?: string | null; venueId?: number | null };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Cuerpo inválido' }, 400);
	}

	const matchId = Number(body.matchId);
	const date = body.date ?? '';
	if (!Number.isInteger(matchId) || !DATE_RE.test(date)) {
		return json({ error: 'Parámetros inválidos' }, 400);
	}

	const venueId = body.venueId == null ? null : Number(body.venueId);
	const time = body.time ?? null;

	const match = await getAdminMatch(matchId);
	if (!match) return json({ error: 'Partido no encontrado' }, 404);

	const [teamConflicts, venueConflicts, specialDates, rainDates] = await Promise.all([
		getTeamConflicts(matchId, match.home_id, match.away_id, date),
		getVenueConflicts(matchId, venueId, date, time),
		getSpecialDates(),
		getAvailableRainDates(match.home_id, match.away_id, new Date().toISOString().slice(0, 10)),
	]);

	const special = specialDates.filter((s) => s.date === date);

	return json({
		teamConflicts,
		venueConflicts,
		special,
		rainDates,
		homeTeam: match.home_team,
		awayTeam: match.away_team,
	});
};

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
	});
}
