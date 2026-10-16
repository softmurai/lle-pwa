import { env } from 'cloudflare:workers';

export interface StandingRow {
	position: number;
	id: number;
	name: string;
	short_name: string;
	played: number;
	wins: number;
	losses: number;
	ties: number;
	forfeits: number;
	points_for: number;
	points_against: number;
	diff: number;
	points: number;
	form: ('W' | 'L' | 'F' | 'T')[];
}

export interface FormMatchRow {
	home_team_id: number;
	away_team_id: number;
	home_score: number | null;
	away_score: number | null;
	status: string;
	forfeit_team_id: number | null;
}

export async function getStandings(limit = 0): Promise<StandingRow[]> {
	const limitClause = limit > 0 ? `LIMIT ${Math.floor(limit)}` : '';
	const res = await env.lle_pwa
		.prepare(
			`SELECT t.id, t.name, t.short_name, s.played, s.wins, s.losses, s.ties,
			        s.points_for, s.points_against, s.points,
			        (s.points_for - s.points_against) AS diff
			 FROM standings s
			 JOIN teams t ON t.id = s.team_id
			 ORDER BY s.points DESC, diff DESC, s.points_for DESC
			 ${limitClause}`,
		)
		.all();

	const mres = await env.lle_pwa
		.prepare(
			`SELECT m.home_team_id, m.away_team_id, m.home_score, m.away_score,
			        m.status, m.forfeit_team_id
			 FROM matches m
			 WHERE m.status IN ('finished', 'forfeit')
			 ORDER BY m.date ASC, m.week ASC`,
		)
		.all();

	const byTeam = new Map<number, ('W' | 'L' | 'F' | 'T')[]>();
	const forfeitsByTeam = new Map<number, number>();
	for (const m of mres.results as unknown as FormMatchRow[]) {
		const forfeit = m.status === 'forfeit';
		let homeResult: 'W' | 'L' | 'F' | 'T' = 'L';
		let awayResult: 'W' | 'L' | 'F' | 'T' = 'L';
		if (forfeit) {
			if (m.forfeit_team_id === m.home_team_id) {
				homeResult = 'F';
				awayResult = 'W';
			} else if (m.forfeit_team_id === m.away_team_id) {
				homeResult = 'W';
				awayResult = 'F';
			}
		} else {
			if ((m.home_score ?? 0) > (m.away_score ?? 0)) homeResult = 'W';
			else if ((m.away_score ?? 0) > (m.home_score ?? 0)) awayResult = 'W';
			else {
				homeResult = 'T';
				awayResult = 'T';
			}
		}
		byTeam.set(m.home_team_id, [...(byTeam.get(m.home_team_id) ?? []), homeResult]);
		byTeam.set(m.away_team_id, [...(byTeam.get(m.away_team_id) ?? []), awayResult]);
		if (forfeit) {
			if (m.forfeit_team_id === m.home_team_id) {
				forfeitsByTeam.set(m.home_team_id, (forfeitsByTeam.get(m.home_team_id) ?? 0) + 1);
			}
			if (m.forfeit_team_id === m.away_team_id) {
				forfeitsByTeam.set(m.away_team_id, (forfeitsByTeam.get(m.away_team_id) ?? 0) + 1);
			}
		}
	}

	return (res.results as Omit<StandingRow, 'position' | 'form' | 'forfeits'>[]).map((r, i) => ({
		...r,
		position: i + 1,
		points_for: Number(r.points_for),
		points_against: Number(r.points_against),
		diff: Number(r.diff),
		points: Number(r.points),
		forfeits: forfeitsByTeam.get(r.id) ?? 0,
		form: (byTeam.get(r.id) ?? []).slice(-5),
	}));
}

export interface MatchRow {
	id: number;
	week: number;
	date: string;
	time: string | null;
	home_score: number | null;
	away_score: number | null;
	status: string;
	original_date: string | null;
	home_id: number;
	away_id: number;
	forfeit_team_id: number | null;
	home_team: string;
	home_short: string;
	away_team: string;
	away_short: string;
	venue_name: string | null;
	venue_short: string | null;
	venue_maps: string | null;
}

async function matchesQuery(where = '', orderBy = '', bind: unknown[] = []): Promise<MatchRow[]> {
	const res = await env.lle_pwa
		.prepare(
			`SELECT m.id, m.week, m.date, m.time, m.home_score, m.away_score, m.status,
			        m.original_date,
			        m.home_team_id AS home_id, m.away_team_id AS away_id, m.forfeit_team_id,
			        ht.name AS home_team, ht.short_name AS home_short,
			        at.name AS away_team, at.short_name AS away_short,
			        v.name AS venue_name, v.short_name AS venue_short, v.maps_url AS venue_maps
			 FROM matches m
			 JOIN teams ht ON ht.id = m.home_team_id
			 JOIN teams at ON at.id = m.away_team_id
			 LEFT JOIN venues v ON v.id = m.venue_id
			 ${where}
			 ${orderBy}`,
		)
		.bind(...bind)
		.all();
	return res.results as unknown as MatchRow[];
}

export function getWeekMatches(week: number): Promise<MatchRow[]> {
	return matchesQuery('WHERE m.week = ?', 'ORDER BY m.time ASC, m.date ASC', [week]);
}

export function getAllMatches(): Promise<MatchRow[]> {
	return matchesQuery('', 'ORDER BY m.week ASC, m.date ASC');
}

export async function getLatestWeek(): Promise<number | null> {
	const row = (await env.lle_pwa
		.prepare('SELECT MAX(week) AS week FROM matches')
		.first()) as { week: number | null } | null;
	return row?.week ?? null;
}

export async function getLastPlayedWeek(): Promise<number | null> {
	const row = (await env.lle_pwa
		.prepare(
			"SELECT MAX(week) AS week FROM matches WHERE status IN ('finished', 'forfeit')",
		)
		.first()) as { week: number | null } | null;
	return row?.week ?? null;
}

export async function getUpcomingWeek(afterWeek: number | null): Promise<number | null> {
	const row = (await env.lle_pwa
		.prepare(
			afterWeek === null
				? 'SELECT MIN(week) AS week FROM matches'
				: 'SELECT MIN(week) AS week FROM matches WHERE week > ?',
		)
		.bind(...(afterWeek === null ? [] : [afterWeek]))
		.first()) as { week: number | null } | null;
	return row?.week ?? null;
}

export interface TeamRow {
	id: number;
	name: string;
	short_name: string;
	logo_url: string | null;
	played: number;
	wins: number;
	losses: number;
	ties: number;
}

export async function getTeams(): Promise<TeamRow[]> {
	const res = await env.lle_pwa
		.prepare(
			`SELECT t.id, t.name, t.short_name, t.logo_url,
			        COALESCE(s.played, 0) AS played,
			        COALESCE(s.wins, 0) AS wins,
			        COALESCE(s.losses, 0) AS losses,
			        COALESCE(s.ties, 0) AS ties
			 FROM teams t
			 LEFT JOIN standings s ON s.team_id = t.id
			 ORDER BY t.name COLLATE NOCASE`,
		)
		.all();
	return res.results as unknown as TeamRow[];
}

export async function getTeam(id: number): Promise<TeamRow | null> {
	const row = (await env.lle_pwa
		.prepare(
			`SELECT t.id, t.name, t.short_name, t.logo_url,
			        COALESCE(s.played, 0) AS played,
			        COALESCE(s.wins, 0) AS wins,
			        COALESCE(s.losses, 0) AS losses,
			        COALESCE(s.ties, 0) AS ties
			 FROM teams t
			 LEFT JOIN standings s ON s.team_id = t.id
			 WHERE t.id = ?
			 LIMIT 1`,
		)
		.bind(id)
		.first()) as TeamRow | null;
	return row;
}

export interface PlayerStatRow {
	id: number;
	name: string;
	number: string | null;
	games: number;
	points: number;
	avg_points: number | null;
	fg_made: number;
	three_made: number;
	ft_made: number;
	ft_att: number;
	ft_pct: number | null;
	fouls: number;
}

export async function getRoster(teamId: number): Promise<PlayerStatRow[]> {
	const res = await env.lle_pwa
		.prepare(
			`SELECT p.id, p.name, p.number,
			        COUNT(ms.id) AS games,
			        COALESCE(SUM(ms.points), 0) AS points,
			        ROUND(AVG(ms.points), 1) AS avg_points,
			        COALESCE(SUM(ms.field_goals_made), 0) AS fg_made,
			        COALESCE(SUM(ms.three_pt_made), 0) AS three_made,
			        COALESCE(SUM(ms.free_throws_made), 0) AS ft_made,
			        COALESCE(SUM(ms.free_throws_attempted), 0) AS ft_att,
			        ROUND(SUM(ms.free_throws_made) * 100.0 /
			          NULLIF(SUM(ms.free_throws_attempted), 0), 1) AS ft_pct,
			        COALESCE(SUM(ms.fouls), 0) AS fouls
			 FROM players p
			 LEFT JOIN match_stats ms ON ms.player_id = p.id
			 WHERE p.team_id = ?
			 GROUP BY p.id, p.name, p.number
			 ORDER BY (number IS NULL OR number = ''), CAST(number AS INTEGER), number, p.name COLLATE NOCASE`,
		)
		.bind(teamId)
		.all();
	return res.results as unknown as PlayerStatRow[];
}

export interface PlayerSearchRow {
	id: number;
	name: string;
	number: string | null;
	team_id: number;
	team_name: string;
	games: number;
	points: number;
}

export async function getAllPlayers(): Promise<PlayerSearchRow[]> {
	const res = await env.lle_pwa
		.prepare(
			`SELECT p.id, p.name, p.number,
			        t.id AS team_id, t.name AS team_name,
			        COUNT(ms.id) AS games,
			        COALESCE(SUM(ms.points), 0) AS points
			 FROM players p
			 JOIN teams t ON t.id = p.team_id
			 LEFT JOIN match_stats ms ON ms.player_id = p.id
			 GROUP BY p.id, p.name, p.number, t.id, t.name
			 ORDER BY p.name COLLATE NOCASE`,
		)
		.all();
	return res.results as unknown as PlayerSearchRow[];
}

export interface MatchDetail {
	id: number;
	week: number;
	date: string;
	time: string | null;
	home_score: number | null;
	away_score: number | null;
	status: string;
	home_id: number;
	home_team: string;
	home_short: string;
	home_logo: string | null;
	away_id: number;
	away_team: string;
	away_short: string;
	away_logo: string | null;
	forfeit_team_id: number | null;
	home_q1: number | null;
	home_q2: number | null;
	home_q3: number | null;
	home_q4: number | null;
	away_q1: number | null;
	away_q2: number | null;
	away_q3: number | null;
	away_q4: number | null;
	home_ot1: number | null;
	home_ot2: number | null;
	home_ot3: number | null;
	away_ot1: number | null;
	away_ot2: number | null;
	away_ot3: number | null;
	observations: string | null;
	acta_photo_key: string | null;
	original_date: string | null;
	venue_name: string | null;
	venue_short: string | null;
	venue_maps: string | null;
}

export async function getMatch(id: number): Promise<MatchDetail | null> {
	const row = (await env.lle_pwa
		.prepare(
			`SELECT m.id, m.week, m.date, m.time, m.home_score, m.away_score, m.status,
			        ht.id AS home_id, ht.name AS home_team, ht.short_name AS home_short,
			        ht.logo_url AS home_logo,
			        at.id AS away_id, at.name AS away_team, at.short_name AS away_short,
			        at.logo_url AS away_logo,
			        m.forfeit_team_id,
			        m.home_q1, m.home_q2, m.home_q3, m.home_q4,
			        m.away_q1, m.away_q2, m.away_q3, m.away_q4,
			        m.home_ot1, m.home_ot2, m.home_ot3,
			        m.away_ot1, m.away_ot2, m.away_ot3,
			        m.observations, m.acta_photo_key, m.original_date,
			        v.name AS venue_name, v.short_name AS venue_short, v.maps_url AS venue_maps
			 FROM matches m
			 JOIN teams ht ON ht.id = m.home_team_id
			 JOIN teams at ON at.id = m.away_team_id
			 LEFT JOIN venues v ON v.id = m.venue_id
			 WHERE m.id = ?
			 LIMIT 1`,
		)
		.bind(id)
		.first()) as MatchDetail | null;
	return row;
}

export interface BoxScoreRow {
	team_id: number;
	team_name: string;
	team_short: string;
	player_id: number;
	player_name: string;
	player_number: string | null;
	points: number;
	fg: number;
	three: number;
	ft_made: number;
	ft_att: number;
	fouls: number;
}

export async function getMatchBoxScore(matchId: number): Promise<BoxScoreRow[]> {
	const res = await env.lle_pwa
		.prepare(
			`SELECT t.id AS team_id, t.name AS team_name, t.short_name AS team_short,
			        p.id AS player_id, p.name AS player_name, p.number AS player_number,
			        ms.points, ms.field_goals_made AS fg, ms.three_pt_made AS three,
			        ms.free_throws_made AS ft_made, ms.free_throws_attempted AS ft_att,
			        ms.fouls
			 FROM match_stats ms
			 JOIN players p ON p.id = ms.player_id
			 JOIN teams t ON t.id = p.team_id
			 WHERE ms.match_id = ?
			 ORDER BY t.id, (p.number IS NULL OR p.number = ''), CAST(p.number AS INTEGER), p.number, p.name COLLATE NOCASE`,
		)
		.bind(matchId)
		.all();
	return res.results as unknown as BoxScoreRow[];
}

/* ------------------------------------------------------------------ */
/* Admin                                                              */
/* ------------------------------------------------------------------ */

export interface VenueRow {
	id: number;
	name: string;
	short_name: string;
	maps_url: string | null;
}

export async function getVenues(): Promise<VenueRow[]> {
	const res = await env.lle_pwa
		.prepare('SELECT id, name, short_name, maps_url FROM venues ORDER BY name COLLATE NOCASE')
		.all();
	return res.results as unknown as VenueRow[];
}

export interface SpecialDateRow {
	date: string;
	type: string;
	detail: string | null;
}

export async function getSpecialDates(): Promise<SpecialDateRow[]> {
	const res = await env.lle_pwa
		.prepare('SELECT date, type, detail FROM special_dates ORDER BY date')
		.all();
	return res.results as unknown as SpecialDateRow[];
}

export interface AdminMatchRow {
	id: number;
	week: number;
	date: string;
	time: string | null;
	home_score: number | null;
	away_score: number | null;
	status: string;
	home_id: number;
	home_team: string;
	home_short: string;
	away_id: number;
	away_team: string;
	away_short: string;
	forfeit_team_id: number | null;
	venue_id: number | null;
	venue_name: string | null;
	venue_short: string | null;
	venue_maps: string | null;
	original_date: string | null;
	home_q1: number | null;
	home_q2: number | null;
	home_q3: number | null;
	home_q4: number | null;
	away_q1: number | null;
	away_q2: number | null;
	away_q3: number | null;
	away_q4: number | null;
	home_ot1: number | null;
	home_ot2: number | null;
	home_ot3: number | null;
	away_ot1: number | null;
	away_ot2: number | null;
	away_ot3: number | null;
	observations: string | null;
	acta_photo_key: string | null;
	stat_count: number;
}

const ADMIN_MATCH_COLUMNS = `
	m.id, m.week, m.date, m.time, m.home_score, m.away_score, m.status,
	m.home_team_id AS home_id, m.away_team_id AS away_id, m.forfeit_team_id,
	ht.name AS home_team, ht.short_name AS home_short,
	at.name AS away_team, at.short_name AS away_short,
	m.venue_id, v.name AS venue_name, v.short_name AS venue_short, v.maps_url AS venue_maps,
	m.original_date,
	m.home_q1, m.home_q2, m.home_q3, m.home_q4,
	m.away_q1, m.away_q2, m.away_q3, m.away_q4,
	m.home_ot1, m.home_ot2, m.home_ot3,
	m.away_ot1, m.away_ot2, m.away_ot3,
	m.observations, m.acta_photo_key,
	(SELECT COUNT(*) FROM match_stats ms WHERE ms.match_id = m.id) AS stat_count`;

export async function getMatchesByWeek(week: number): Promise<AdminMatchRow[]> {
	const res = await env.lle_pwa
		.prepare(
			`SELECT ${ADMIN_MATCH_COLUMNS}
			 FROM matches m
			 JOIN teams ht ON ht.id = m.home_team_id
			 JOIN teams at ON at.id = m.away_team_id
			 LEFT JOIN venues v ON v.id = m.venue_id
			 WHERE m.week = ?
			 ORDER BY m.time ASC, m.date ASC`,
		)
		.bind(week)
		.all();
	return res.results as unknown as AdminMatchRow[];
}

export async function getAdminMatch(id: number): Promise<AdminMatchRow | null> {
	const row = (await env.lle_pwa
		.prepare(
			`SELECT ${ADMIN_MATCH_COLUMNS}
			 FROM matches m
			 JOIN teams ht ON ht.id = m.home_team_id
			 JOIN teams at ON at.id = m.away_team_id
			 LEFT JOIN venues v ON v.id = m.venue_id
			 WHERE m.id = ?
			 LIMIT 1`,
		)
		.bind(id)
		.first()) as AdminMatchRow | null;
	return row;
}

export interface JornadaRow {
	week: number;
	first_date: string;
	last_date: string;
	total: number;
	played: number;
	pending: number;
}

export async function getJornadas(): Promise<JornadaRow[]> {
	const res = await env.lle_pwa
		.prepare(
			`SELECT week, MIN(date) AS first_date, MAX(date) AS last_date,
			        COUNT(*) AS total,
			        SUM(CASE WHEN status IN ('finished','forfeit') THEN 1 ELSE 0 END) AS played,
			        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) AS pending
			 FROM matches
			 GROUP BY week
			 ORDER BY week`,
		)
		.all();
	return res.results as unknown as JornadaRow[];
}

export interface TeamPlayerRow {
	id: number;
	name: string;
	number: string | null;
}

/** Roster ordered by dorsal (numeric), players without a number last. */
export async function getTeamPlayers(teamId: number): Promise<TeamPlayerRow[]> {
	const res = await env.lle_pwa
		.prepare(
			`SELECT id, name, number
			 FROM players
			 WHERE team_id = ?
			 ORDER BY (number IS NULL OR number = ''), CAST(number AS INTEGER), number, name COLLATE NOCASE`,
		)
		.bind(teamId)
		.all();
	return res.results as unknown as TeamPlayerRow[];
}

export interface MatchStatRow {
	player_id: number;
	points: number;
	fg2: number;
	fg3: number;
	ftm: number;
	fta: number;
	fouls: number;
}

export async function getMatchStats(matchId: number): Promise<MatchStatRow[]> {
	const res = await env.lle_pwa
		.prepare(
			`SELECT player_id, points,
			        field_goals_made AS fg2, three_pt_made AS fg3,
			        free_throws_made AS ftm, free_throws_attempted AS fta,
			        fouls
			 FROM match_stats
			 WHERE match_id = ?`,
		)
		.bind(matchId)
		.all();
	return res.results as unknown as MatchStatRow[];
}

export interface ConflictMatch {
	id: number;
	week: number;
	date: string;
	time: string | null;
	home_team: string;
	away_team: string;
}

/** Other matches on `date` that involve either team. */
export async function getTeamConflicts(
	matchId: number,
	homeId: number,
	awayId: number,
	date: string,
): Promise<ConflictMatch[]> {
	const res = await env.lle_pwa
		.prepare(
			`SELECT m.id, m.week, m.date, m.time,
			        ht.name AS home_team, at.name AS away_team
			 FROM matches m
			 JOIN teams ht ON ht.id = m.home_team_id
			 JOIN teams at ON at.id = m.away_team_id
			 WHERE m.date = ?
			   AND m.id != ?
			   AND (m.home_team_id IN (?, ?) OR m.away_team_id IN (?, ?))
			 ORDER BY m.time`,
		)
		.bind(date, matchId, homeId, awayId, homeId, awayId)
		.all();
	return res.results as unknown as ConflictMatch[];
}

/** Other matches at the same venue and time on `date`. */
export async function getVenueConflicts(
	matchId: number,
	venueId: number | null,
	date: string,
	time: string | null,
): Promise<ConflictMatch[]> {
	if (!venueId || !time) return [];
	const res = await env.lle_pwa
		.prepare(
			`SELECT m.id, m.week, m.date, m.time,
			        ht.name AS home_team, at.name AS away_team
			 FROM matches m
			 JOIN teams ht ON ht.id = m.home_team_id
			 JOIN teams at ON at.id = m.away_team_id
			 WHERE m.venue_id = ? AND m.date = ? AND m.time = ? AND m.id != ?
			 ORDER BY m.week`,
		)
		.bind(venueId, date, time, matchId)
		.all();
	return res.results as unknown as ConflictMatch[];
}

/** Free reserved (lluvia) dates: in the future and neither team plays that day. */
export async function getAvailableRainDates(
	homeId: number,
	awayId: number,
	fromDate: string,
): Promise<SpecialDateRow[]> {
	const res = await env.lle_pwa
		.prepare(
			`SELECT date, type, detail
			 FROM special_dates
			 WHERE type = 'lluvia'
			   AND date >= ?
			   AND date NOT IN (
			     SELECT date FROM matches
			     WHERE home_team_id IN (?, ?) OR away_team_id IN (?, ?)
			   )
			 ORDER BY date`,
		)
		.bind(fromDate, homeId, awayId, homeId, awayId)
		.all();
	return res.results as unknown as SpecialDateRow[];
}

export interface ScheduleChange {
	date: string;
	time: string | null;
	venue_id: number | null;
}

/** Updates date/time/venue, tracking the original date for the aplazado/adelantado badge. */
export async function applyScheduleChange(
	matchId: number,
	change: ScheduleChange,
): Promise<void> {
	const current = (await env.lle_pwa
		.prepare('SELECT date, original_date FROM matches WHERE id = ?')
		.bind(matchId)
		.first()) as { date: string; original_date: string | null } | null;
	if (!current) return;

	let original = current.original_date;
	if (change.date !== current.date) {
		original = original ?? current.date;
	}
	if (original && change.date === original) {
		original = null; // moved back to the original date: no badge
	}

	await env.lle_pwa
		.prepare('UPDATE matches SET date = ?, time = ?, venue_id = ?, original_date = ? WHERE id = ?')
		.bind(change.date, change.time, change.venue_id, original, matchId)
		.run();
}

/** Recomputes the standings cache from every finished/forfeit match. */
export async function recomputeStandings(): Promise<void> {
	const res = await env.lle_pwa
		.prepare(
			`SELECT home_team_id, away_team_id, home_score, away_score, status, forfeit_team_id
			 FROM matches
			 WHERE status IN ('finished', 'forfeit')`,
		)
		.all();

	type Acc = {
		played: number;
		wins: number;
		losses: number;
		ties: number;
		pf: number;
		pa: number;
		points: number;
	};
	const acc = new Map<number, Acc>();
	const get = (id: number): Acc => {
		let a = acc.get(id);
		if (!a) {
			a = { played: 0, wins: 0, losses: 0, ties: 0, pf: 0, pa: 0, points: 0 };
			acc.set(id, a);
		}
		return a;
	};

	for (const raw of res.results as unknown as {
		home_team_id: number;
		away_team_id: number;
		home_score: number | null;
		away_score: number | null;
		status: string;
		forfeit_team_id: number | null;
	}[]) {
		const home = get(raw.home_team_id);
		const away = get(raw.away_team_id);

		if (raw.status === 'forfeit') {
			const homeForfeits = raw.forfeit_team_id === raw.home_team_id;
			home.played++;
			away.played++;
			if (homeForfeits) {
				home.losses++;
				away.wins++;
				home.pf += 0;
				home.pa += 20;
				away.pf += 20;
				away.pa += 0;
				away.points += 2;
			} else {
				away.losses++;
				home.wins++;
				away.pf += 0;
				away.pa += 20;
				home.pf += 20;
				home.pa += 0;
				home.points += 2;
			}
			continue;
		}

		const hs = raw.home_score ?? 0;
		const as_ = raw.away_score ?? 0;
		home.played++;
		away.played++;
		home.pf += hs;
		home.pa += as_;
		away.pf += as_;
		away.pa += hs;
		if (hs > as_) {
			home.wins++;
			away.losses++;
			home.points += 2;
			away.points += 1;
		} else if (as_ > hs) {
			away.wins++;
			home.losses++;
			away.points += 2;
			home.points += 1;
		} else {
			home.ties++;
			away.ties++;
			home.points += 1;
			away.points += 1;
		}
	}

	const stmts = [...acc.entries()].map(([teamId, a]) =>
		env.lle_pwa
			.prepare(
				`UPDATE standings SET played = ?, wins = ?, losses = ?, ties = ?, points_for = ?, points_against = ?, points = ?
				 WHERE team_id = ?`,
			)
			.bind(a.played, a.wins, a.losses, a.ties, a.pf, a.pa, a.points, teamId),
	);
	if (stmts.length) await env.lle_pwa.batch(stmts);
}

/** Wipes the stored result of a match (scores, quarters, OT and player stats). */
export function clearResultStatements(matchId: number): D1PreparedStatement[] {
	return [
		env.lle_pwa
			.prepare(
				`UPDATE matches SET
					home_score = NULL, away_score = NULL,
					home_q1 = NULL, home_q2 = NULL, home_q3 = NULL, home_q4 = NULL,
					away_q1 = NULL, away_q2 = NULL, away_q3 = NULL, away_q4 = NULL,
					home_ot1 = NULL, home_ot2 = NULL, home_ot3 = NULL,
					away_ot1 = NULL, away_ot2 = NULL, away_ot3 = NULL
				 WHERE id = ?`,
			)
			.bind(matchId),
		env.lle_pwa.prepare('DELETE FROM match_stats WHERE match_id = ?').bind(matchId),
	];
}