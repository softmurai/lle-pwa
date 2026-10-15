/**
 * Match acta validation. Shared by the React form (live feedback) and the
 * results API (authoritative check) so the rules live in exactly one place.
 */

export interface PlayerStatInput {
	player_id: number;
	played: boolean;
	fg2: number;
	fg3: number;
	ftm: number;
	fta: number;
	fouls: number;
}

export interface QuarterScores {
	q1: number | null;
	q2: number | null;
	q3: number | null;
	q4: number | null;
	ot1: number | null;
	ot2: number | null;
	ot3: number | null;
}

export type MatchStatus = 'finished' | 'forfeit' | 'cancelled' | 'postponed';

export interface MatchResultInput {
	status: MatchStatus;
	forfeit_team_id: number | null;
	home: QuarterScores;
	away: QuarterScores;
	home_stats: PlayerStatInput[];
	away_stats: PlayerStatInput[];
	observations: string | null;
	acta_photo_key: string | null;
	/** Save just the scoreline, leaving player statistics pending. */
	resultOnly?: boolean;
}

export interface ValidationContext {
	homeId: number;
	awayId: number;
	homePlayers: number[];
	awayPlayers: number[];
	maxPlayers?: number;
}

export interface Issue {
	path: string;
	message: string;
}

export interface ValidationResult {
	ok: boolean;
	issues: Issue[];
	homeScore: number;
	awayScore: number;
}

export const MAX_PLAYERS = 15;
export const MAX_FOULS = 5;

export function pointsOf(p: Pick<PlayerStatInput, 'fg2' | 'fg3' | 'ftm'>): number {
	return (p.fg2 || 0) * 2 + (p.fg3 || 0) * 3 + (p.ftm || 0);
}

export function emptyScores(): QuarterScores {
	return { q1: null, q2: null, q3: null, q4: null, ot1: null, ot2: null, ot3: null };
}

export function emptyPlayer(playerId: number): PlayerStatInput {
	return { player_id: playerId, played: false, fg2: 0, fg3: 0, ftm: 0, fta: 0, fouls: 0 };
}

function isNonNegInt(v: unknown): v is number {
	return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

function sumQuarters(s: QuarterScores): number {
	// Regulation is always required; OT is optional.
	const reg = (s.q1 ?? 0) + (s.q2 ?? 0) + (s.q3 ?? 0) + (s.q4 ?? 0);
	const ot = (s.ot1 ?? 0) + (s.ot2 ?? 0) + (s.ot3 ?? 0);
	return reg + ot;
}

function validateScores(
	side: 'home' | 'away',
	s: QuarterScores,
	issues: Issue[],
): void {
	for (const k of ['q1', 'q2', 'q3', 'q4'] as const) {
		const v = s[k];
		if (!isNonNegInt(v)) {
			issues.push({ path: `${side}.${k}`, message: `Marca del período inválida` });
		}
	}
	// Overtime must be filled in order and for both teams (enforced per side here).
	const ots = ['ot1', 'ot2', 'ot3'] as const;
	let prevFilled = true;
	for (const k of ots) {
		const v = s[k];
		if (v === null || v === undefined) {
			prevFilled = false;
			continue;
		}
		if (!prevFilled) {
			issues.push({ path: `${side}.${k}`, message: `No puede haber prórrogas con huecos` });
		}
		if (!isNonNegInt(v)) {
			issues.push({ path: `${side}.${k}`, message: `Marca de prórroga inválida` });
		}
	}
}

function validateTeamStats(
	side: 'home' | 'away',
	stats: PlayerStatInput[],
	roster: number[],
	teamTotal: number,
	maxPlayers: number,
	issues: Issue[],
): void {
	const rosterSet = new Set(roster);
	const playedCount = stats.filter((p) => p.played).length;

	if (playedCount > maxPlayers) {
		issues.push({ path: `${side}.players`, message: `Máximo ${maxPlayers} jugadores alineados (${playedCount})` });
	}

	let pointsSum = 0;
	const seen = new Set<number>();
	for (const p of stats) {
		const key = `${side}.${p.player_id}`;
		if (!rosterSet.has(p.player_id)) {
			issues.push({ path: key, message: `Jugador no pertenece al equipo` });
			continue;
		}
		if (seen.has(p.player_id)) {
			issues.push({ path: key, message: `Jugador duplicado` });
			continue;
		}
		seen.add(p.player_id);

		for (const f of ['fg2', 'fg3', 'ftm', 'fta', 'fouls'] as const) {
			if (!isNonNegInt(p[f])) {
				issues.push({ path: `${key}.${f}`, message: `Valor inválido` });
			}
		}
		if (p.fouls > MAX_FOULS) {
			issues.push({ path: `${key}.fouls`, message: `Máximo ${MAX_FOULS} faltas` });
		}
		if (p.fta < p.ftm) {
			issues.push({ path: `${key}.fta`, message: `TL intentados no puede ser menor que anotados` });
		}
		if (!p.played) {
			const anyStat = p.fg2 || p.fg3 || p.ftm || p.fta || p.fouls;
			if (anyStat) {
				issues.push({ path: key, message: `Jugador no alineado no puede tener estadísticas` });
			}
			continue;
		}
		pointsSum += pointsOf(p);
	}

	if (playedCount > 0 && pointsSum !== teamTotal) {
		issues.push({
			path: `${side}.total`,
			message: `Los puntos de los jugadores (${pointsSum}) no cuadran con el marcador (${teamTotal})`,
		});
	}
}

export function validateMatchResult(
	input: MatchResultInput,
	ctx: ValidationContext,
): ValidationResult {
	const issues: Issue[] = [];
	const maxPlayers = ctx.maxPlayers ?? MAX_PLAYERS;

	if (input.status === 'forfeit') {
		if (input.forfeit_team_id !== ctx.homeId && input.forfeit_team_id !== ctx.awayId) {
			issues.push({ path: 'match.forfeit', message: 'Selecciona el equipo que no se presentó' });
		}
		return { ok: issues.length === 0, issues, homeScore: 20, awayScore: 0 };
	}

	if (input.status === 'cancelled' || input.status === 'postponed') {
		return { ok: true, issues: [], homeScore: 0, awayScore: 0 };
	}

	// status === 'finished'
	validateScores('home', input.home, issues);
	validateScores('away', input.away, issues);

	const homeScore = sumQuarters(input.home);
	const awayScore = sumQuarters(input.away);

	if (homeScore === awayScore) {
		issues.push({
			path: 'match.tie',
			message: 'Un partido finalizado no puede acabar en empate: añade prórroga',
		});
	}

	// OT must be present for both sides in the same number of periods.
	const otCount = (s: QuarterScores) => (s.ot1 == null ? 0 : 1) + (s.ot2 == null ? 0 : 1) + (s.ot3 == null ? 0 : 1);
	if (otCount(input.home) !== otCount(input.away)) {
		issues.push({ path: 'match.ot', message: 'Las prórrogas deben registrarse para ambos equipos' });
	}

	if (!input.resultOnly) {
		validateTeamStats('home', input.home_stats, ctx.homePlayers, homeScore, maxPlayers, issues);
		validateTeamStats('away', input.away_stats, ctx.awayPlayers, awayScore, maxPlayers, issues);
	}

	return { ok: issues.length === 0, issues, homeScore, awayScore };
}

export function issuesByPath(result: ValidationResult): Map<string, string> {
	const map = new Map<string, string>();
	for (const i of result.issues) map.set(i.path, i.message);
	return map;
}
