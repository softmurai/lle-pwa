import { env } from 'cloudflare:workers';

export interface StandingRow {
	position: number;
	id: number;
	name: string;
	short_name: string;
	played: number;
	wins: number;
	losses: number;
	points_for: number;
	points_against: number;
	diff: number;
}

export async function getStandings(limit = 0): Promise<StandingRow[]> {
	const limitClause = limit > 0 ? `LIMIT ${Math.floor(limit)}` : '';
	const res = await env.lle_pwa
		.prepare(
			`SELECT t.id, t.name, t.short_name, s.played, s.wins, s.losses,
			        s.points_for, s.points_against,
			        (s.points_for - s.points_against) AS diff
			 FROM standings s
			 JOIN teams t ON t.id = s.team_id
			 ORDER BY s.wins DESC, diff DESC, s.points_for DESC
			 ${limitClause}`,
		)
		.all();
	return (res.results as Omit<StandingRow, 'position'>[]).map((r, i) => ({
		...r,
		position: i + 1,
		points_for: Number(r.points_for),
		points_against: Number(r.points_against),
		diff: Number(r.diff),
	}));
}

export interface MatchRow {
	id: number;
	week: number;
	date: string;
	home_score: number | null;
	away_score: number | null;
	status: string;
	home_team: string;
	home_short: string;
	away_team: string;
	away_short: string;
}

async function matchesQuery(where = '', orderBy = '', bind: unknown[] = []): Promise<MatchRow[]> {
	const res = await env.lle_pwa
		.prepare(
			`SELECT m.id, m.week, m.date, m.home_score, m.away_score, m.status,
			        ht.name AS home_team, ht.short_name AS home_short,
			        at.name AS away_team, at.short_name AS away_short
			 FROM matches m
			 JOIN teams ht ON ht.id = m.home_team_id
			 JOIN teams at ON at.id = m.away_team_id
			 ${where}
			 ${orderBy}`,
		)
		.bind(...bind)
		.all();
	return res.results as unknown as MatchRow[];
}

export function getWeekMatches(week: number): Promise<MatchRow[]> {
	return matchesQuery('WHERE m.week = ?', 'ORDER BY m.date ASC', [week]);
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

export interface TeamRow {
	id: number;
	name: string;
	short_name: string;
	played: number;
	wins: number;
	losses: number;
}

export async function getTeams(): Promise<TeamRow[]> {
	const res = await env.lle_pwa
		.prepare(
			`SELECT t.id, t.name, t.short_name,
			        COALESCE(s.played, 0) AS played,
			        COALESCE(s.wins, 0) AS wins,
			        COALESCE(s.losses, 0) AS losses
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
			`SELECT t.id, t.name, t.short_name,
			        COALESCE(s.played, 0) AS played,
			        COALESCE(s.wins, 0) AS wins,
			        COALESCE(s.losses, 0) AS losses
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
	number: number | null;
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
			 ORDER BY points DESC, p.name COLLATE NOCASE`,
		)
		.bind(teamId)
		.all();
	return res.results as unknown as PlayerStatRow[];
}

export interface PlayerSearchRow {
	id: number;
	name: string;
	number: number | null;
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
	home_score: number | null;
	away_score: number | null;
	status: string;
	home_id: number;
	home_team: string;
	home_short: string;
	away_id: number;
	away_team: string;
	away_short: string;
}

export async function getMatch(id: number): Promise<MatchDetail | null> {
	const row = (await env.lle_pwa
		.prepare(
			`SELECT m.id, m.week, m.date, m.home_score, m.away_score, m.status,
			        ht.id AS home_id, ht.name AS home_team, ht.short_name AS home_short,
			        at.id AS away_id, at.name AS away_team, at.short_name AS away_short
			 FROM matches m
			 JOIN teams ht ON ht.id = m.home_team_id
			 JOIN teams at ON at.id = m.away_team_id
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
	player_number: number | null;
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
			 ORDER BY t.id, ms.points DESC, p.name COLLATE NOCASE`,
		)
		.bind(matchId)
		.all();
	return res.results as unknown as BoxScoreRow[];
}