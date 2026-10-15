import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
	validateMatchResult,
	type MatchResultInput,
	type PlayerStatInput,
} from '../../../../../lib/validation/match-acta';
import {
	clearResultStatements,
	getAdminMatch,
	getTeamPlayers,
	recomputeStandings,
} from '../../../../../lib/db';

export const prerender = false;

const VALID_STATUSES = new Set(['finished', 'forfeit', 'cancelled', 'postponed']);

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
	});
}

export const POST: APIRoute = async ({ params, request }) => {
	const matchId = Number.parseInt(params.id ?? '', 10);
	if (!Number.isInteger(matchId)) return json({ error: 'ID inválido' }, 400);

	const match = await getAdminMatch(matchId);
	if (!match) return json({ error: 'Partido no encontrado' }, 404);

	let body: MatchResultInput;
	try {
		body = (await request.json()) as MatchResultInput;
	} catch {
		return json({ error: 'Cuerpo inválido' }, 400);
	}

	if (!VALID_STATUSES.has(body.status)) {
		return json({ error: 'Estado no válido' }, 400);
	}

	const [homePlayers, awayPlayers] = await Promise.all([
		getTeamPlayers(match.home_id),
		getTeamPlayers(match.away_id),
	]);

	const result = validateMatchResult(body, {
		homeId: match.home_id,
		awayId: match.away_id,
		homePlayers: homePlayers.map((p) => p.id),
		awayPlayers: awayPlayers.map((p) => p.id),
	});

	if (!result.ok) {
		return json({ error: 'Datos del acta inválidos', issues: result.issues }, 422);
	}

	const now = 'datetime(' + "'now'" + ')';
	void now;

	if (body.status === 'finished') {
		const hs = result.homeScore;
		const as_ = result.awayScore;
		const statements = [
			env.lle_pwa
				.prepare(
					`UPDATE matches SET
						status = 'finished', forfeit_team_id = NULL,
						home_score = ?, away_score = ?,
						home_q1 = ?, home_q2 = ?, home_q3 = ?, home_q4 = ?,
						away_q1 = ?, away_q2 = ?, away_q3 = ?, away_q4 = ?,
						home_ot1 = ?, home_ot2 = ?, home_ot3 = ?,
						away_ot1 = ?, away_ot2 = ?, away_ot3 = ?,
						observations = ?, acta_photo_key = ?
					 WHERE id = ?`,
				)
				.bind(
					hs,
					as_,
					body.home.q1,
					body.home.q2,
					body.home.q3,
					body.home.q4,
					body.away.q1,
					body.away.q2,
					body.away.q3,
					body.away.q4,
					body.home.ot1,
					body.home.ot2,
					body.home.ot3,
					body.away.ot1,
					body.away.ot2,
					body.away.ot3,
					body.observations,
					body.acta_photo_key,
					matchId,
				),
			env.lle_pwa.prepare('DELETE FROM match_stats WHERE match_id = ?').bind(matchId),
		];

		// Result only: keep the scoreline, leave statistics pending (none stored).
		if (!body.resultOnly) {
			const insertStat = (p: PlayerStatInput) =>
				env.lle_pwa
					.prepare(
						`INSERT INTO match_stats
							(match_id, player_id, points, field_goals_made, three_pt_made,
							 free_throws_made, free_throws_attempted, fouls)
						 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
					)
					.bind(
						matchId,
						p.player_id,
						(p.fg2 || 0) * 2 + (p.fg3 || 0) * 3 + (p.ftm || 0),
						p.fg2 || 0,
						p.fg3 || 0,
						p.ftm || 0,
						p.fta || 0,
						p.fouls || 0,
					);

			for (const p of body.home_stats) if (p.played) statements.push(insertStat(p));
			for (const p of body.away_stats) if (p.played) statements.push(insertStat(p));
		}

		await env.lle_pwa.batch(statements);
	} else if (body.status === 'forfeit') {
		const homeForfeits = body.forfeit_team_id === match.home_id;
		const homeScore = homeForfeits ? 0 : 20;
		const awayScore = homeForfeits ? 20 : 0;
		const statements = [
			env.lle_pwa
				.prepare(
					`UPDATE matches SET
						status = 'forfeit', forfeit_team_id = ?,
						home_score = ?, away_score = ?,
						home_q1 = NULL, home_q2 = NULL, home_q3 = NULL, home_q4 = NULL,
						away_q1 = NULL, away_q2 = NULL, away_q3 = NULL, away_q4 = NULL,
						home_ot1 = NULL, home_ot2 = NULL, home_ot3 = NULL,
						away_ot1 = NULL, away_ot2 = NULL, away_ot3 = NULL,
						observations = ?, acta_photo_key = ?
					 WHERE id = ?`,
				)
				.bind(
					body.forfeit_team_id,
					homeScore,
					awayScore,
					body.observations,
					body.acta_photo_key,
					matchId,
				),
			env.lle_pwa.prepare('DELETE FROM match_stats WHERE match_id = ?').bind(matchId),
		];
		await env.lle_pwa.batch(statements);
	} else {
		// cancelled | postponed: wipe scores/stats, keep the photo/observations.
		const statements = clearResultStatements(matchId);
		statements.push(
			env.lle_pwa
				.prepare(
					`UPDATE matches SET status = ?, forfeit_team_id = NULL, observations = ?, acta_photo_key = ? WHERE id = ?`,
				)
				.bind(body.status, body.observations, body.acta_photo_key, matchId),
		);
		await env.lle_pwa.batch(statements);
	}

	await recomputeStandings();

	return json({ ok: true, homeScore: result.homeScore, awayScore: result.awayScore });
};
