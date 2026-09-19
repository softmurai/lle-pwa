import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { runImport } from './engine';

const MIGRATIONS = [
	'migrations/0001_create_schema.sql',
	'migrations/0002_drop_unused_stat_columns.sql',
	'migrations/0003_drop_remaining_unused_stat_columns.sql',
	'migrations/0004_add_match_time_points.sql',
];

const VALID_CSV = [
	'week,date,time,home_team,away_team,home_score,away_score,status,team,player,number,points,2pm,3pm,ftm,fta,fouls',
	'1,2026-09-19,08:30,Cebras,Vikingos,81,78,finished,Cebras,Dani Moreno,4,5,1,1,0,1,5',
	'1,2026-09-19,08:30,Cebras,Vikingos,81,78,finished,Cebras,Pau Ruiz,5,6,0,1,3,3,1',
	'1,2026-09-19,08:30,Cebras,Vikingos,81,78,finished,Vikingos,Alex Serrano,7,12,3,2,0,2,4',
	'1,2026-09-19,08:30,Cebras,Vikingos,81,78,finished,Vikingos,Marc Vidal,9,9,2,1,2,2,3',
].join('\n');

const FORFEIT_CSV = [
	'week,date,time,home_team,away_team,home_score,away_score,status,team,player,number,points,2pm,3pm,ftm,fta,fouls,forfeit_team',
	'1,2026-09-19,08:30,Cebras,Vikingos,81,0,finished,Cebras,Dani Moreno,4,5,1,1,0,1,5,',
	'1,2026-09-19,08:30,Cebras,Vikingos,81,0,finished,Vikingos,Alex Serrano,7,12,3,2,0,2,4,Vikingos',
].join('\n');

interface D1Result {
	meta: { changes: number };
}

class MockStatement {
	constructor(
		private db: Database.Database,
		private sql: string,
		private params: unknown[] = [],
	) {}

	bind(...params: unknown[]): MockStatement {
		return new MockStatement(this.db, this.sql, params);
	}

	run(): D1Result {
		const stmt = this.db.prepare(this.sql);
		const res = this.params.length ? stmt.run(...this.params) : stmt.run();
		return { meta: { changes: res.changes } };
	}

	first<T>(): T | null {
		const stmt = this.db.prepare(this.sql);
		const row = this.params.length ? stmt.get(...this.params) : stmt.get();
		return (row as T) ?? null;
	}

	all<T>(): { results: T[] } {
		const stmt = this.db.prepare(this.sql);
		const rows = this.params.length ? stmt.all(...this.params) : stmt.all();
		return { results: rows as T[] };
	}
}

class MockD1 {
	static open(db: Database.Database): MockD1 {
		return new MockD1(db);
	}

	constructor(private db: Database.Database) {}

	prepare(sql: string): MockStatement {
		return new MockStatement(this.db, sql);
	}

	async batch(statements: MockStatement[]): Promise<D1Result[]> {
		const fn = this.db.transaction(() =>
			statements.map((s) => s.run()),
		);
		return fn();
	}

	async exec(sql: string): Promise<void> {
		this.db.exec(sql);
	}
}

let db: MockD1;

beforeAll(async () => {
	db = MockD1.open(new Database(':memory:'));
	for (const file of MIGRATIONS) {
		await db.exec(await readFile(file, 'utf8'));
	}
});

const count = (table: string): number => {
	const row = db
		.prepare(`SELECT COUNT(*) AS n FROM ${table}`)
		.first<{ n: number }>();
	return row?.n ?? 0;
};

describe('runImport', () => {
	it('importa un CSV válido y calcula la clasificación', async () => {
		const report = await runImport(db as unknown as D1Database, VALID_CSV);

		expect(report.ok).toBe(true);
		expect(report.errors).toEqual([]);
		expect(report.teams).toBe(2);
		expect(report.players).toBe(4);
		expect(report.matches).toBe(1);
		expect(report.matchStats).toBe(4);
		expect(report.standings).toBe(true);

		expect(count('teams')).toBe(2);
		expect(count('players')).toBe(4);
		expect(count('matches')).toBe(1);
		expect(count('match_stats')).toBe(4);

		const cebras = db
			.prepare(
				`SELECT s.* FROM standings s JOIN teams t ON t.id = s.team_id WHERE t.name = 'Cebras'`,
			)
			.first<{
				played: number;
				wins: number;
				losses: number;
				points_for: number;
				points_against: number;
				points: number;
			}>();
		expect(cebras?.played).toBe(1);
		expect(cebras?.wins).toBe(1);
		expect(cebras?.losses).toBe(0);
		expect(cebras?.points_for).toBe(81);
		expect(cebras?.points_against).toBe(78);
		expect(cebras?.points).toBe(2);

		const vikingos = db
			.prepare(
				`SELECT s.* FROM standings s JOIN teams t ON t.id = s.team_id WHERE t.name = 'Vikingos'`,
			)
			.first<{ wins: number; losses: number; points_for: number; points: number }>();
		expect(vikingos?.wins).toBe(0);
		expect(vikingos?.losses).toBe(1);
		expect(vikingos?.points_for).toBe(78);
		expect(vikingos?.points).toBe(1);

		const time = db
			.prepare(`SELECT time FROM matches LIMIT 1`)
			.first<{ time: string }>();
		expect(time?.time).toBe('08:30');
	});

	it('re-importar el mismo CSV no duplica datos (upsert idempotente)', async () => {
		const report = await runImport(db as unknown as D1Database, VALID_CSV);

		expect(report.ok).toBe(true);
		expect(count('teams')).toBe(2);
		expect(count('players')).toBe(4);
		expect(count('matches')).toBe(1);
		expect(count('match_stats')).toBe(4);
	});

	it('rechaza un CSV con columnas faltantes', async () => {
		const bad = 'week,date,home_team\n1,2026-09-19,Cebras\n';
		const report = await runImport(db as unknown as D1Database, bad);

		expect(report.ok).toBe(false);
		expect(report.errors[0]).toContain('Faltan columnas');
	});

	it('rechaza marcadores no numéricos y lo reporta en skipped', async () => {
		const bad = VALID_CSV.replace('81,78', 'ochenta,78');
		const report = await runImport(db as unknown as D1Database, bad);

		expect(report.ok).toBe(false);
		expect(report.skipped).toBeGreaterThan(0);
		expect(report.errors.join('')).toContain('marcadores no numéricos');
	});

	it('rechaza filas donde team no coincide con home/away', async () => {
		const bad = VALID_CSV.replace(
			'finished,Cebras,Dani Moreno',
			'finished,Lobos,Dani Moreno',
		);
		const report = await runImport(db as unknown as D1Database, bad);

		expect(report.ok).toBe(false);
		expect(report.skipped).toBeGreaterThan(0);
		expect(report.errors.join('')).toContain('no coincide');
	});

	it('devuelve error si el CSV está vacío', async () => {
		const report = await runImport(db as unknown as D1Database, '');

		expect(report.ok).toBe(false);
		expect(report.errors[0]).toContain('vacío');
	});

	it('un partido con forfeit_team da 0 pts al equipo sancionado y resultado 20-0', async () => {
		const report = await runImport(db as unknown as D1Database, FORFEIT_CSV);

		expect(report.ok).toBe(true);
		expect(report.matches).toBe(1);

		const cebras = db
			.prepare(
				`SELECT s.* FROM standings s JOIN teams t ON t.id = s.team_id WHERE t.name = 'Cebras'`,
			)
			.first<{ wins: number; losses: number; points: number; points_for: number; points_against: number }>();
		expect(cebras?.wins).toBe(1);
		expect(cebras?.losses).toBe(0);
		expect(cebras?.points).toBe(2);
		expect(cebras?.points_for).toBe(20);
		expect(cebras?.points_against).toBe(0);

		const vikingos = db
			.prepare(
				`SELECT s.* FROM standings s JOIN teams t ON t.id = s.team_id WHERE t.name = 'Vikingos'`,
			)
			.first<{ wins: number; losses: number; points: number; points_for: number; points_against: number }>();
		expect(vikingos?.wins).toBe(0);
		expect(vikingos?.losses).toBe(1);
		expect(vikingos?.points).toBe(0);
		expect(vikingos?.points_for).toBe(0);
		expect(vikingos?.points_against).toBe(20);

		const match = db
			.prepare(`SELECT status, forfeit_team_id, home_score, away_score FROM matches LIMIT 1`)
			.first<{ status: string; forfeit_team_id: number; home_score: number; away_score: number }>();
		expect(match?.status).toBe('forfeit');
		expect(match?.forfeit_team_id).not.toBeNull();
		expect(match?.home_score).toBe(20);
		expect(match?.away_score).toBe(0);
	});
});