// Motor de importación: CSV (hoja de cálculo publicada) -> validación -> upsert en D1.
// Formato CSV esperado (una fila por jugador y partido):
//   week,date,time,home_team,away_team,home_score,away_score,status,
//   team,player,number,points,2pm,3pm,ftm,fta,fouls
//   (columna opcional: forfeit_team => partido no presentado/sanción, 0 pts)

export interface ImportEnv {
  lle_pwa: D1Database;
  IMPORT_CSV_URL: string;
  IMPORT_SECRET: string;
}

export interface ImportReport {
  ok: boolean;
  teams: number;
  players: number;
  matches: number;
  matchStats: number;
  standings: boolean;
  skipped: number;
  errors: string[];
}

const REQUIRED_HEADERS = [
  'week', 'date', 'time', 'home_team', 'away_team', 'home_score', 'away_score', 'status',
  'team', 'player', 'number', 'points', '2pm', '3pm', 'ftm', 'fta', 'fouls',
];

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f.length > 0)) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((f) => f.length > 0)) rows.push(row);
  return rows;
}

export async function runImport(db: D1Database, csvText: string): Promise<ImportReport> {
  const report: ImportReport = { ok: false, teams: 0, players: 0, matches: 0, matchStats: 0, standings: false, skipped: 0, errors: [] };

  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    report.errors.push('El CSV está vacío o no tiene filas de datos.');
    return report;
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const missing = REQUIRED_HEADERS.filter((h) => !header.includes(h));
  if (missing.length > 0) {
    report.errors.push(`Faltan columnas: ${missing.join(', ')}`);
    return report;
  }
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));

  const matchForfeit = new Map<string, string>();
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const wk = (row[idx['week']] ?? '').trim();
    const hm = (row[idx['home_team']] ?? '').trim();
    const aw = (row[idx['away_team']] ?? '').trim();
    const ft = idx['forfeit_team'] === undefined ? '' : (row[idx['forfeit_team']] ?? '').trim();
    if (!wk || !hm || !aw || !ft) continue;
    const key = `${wk}|${hm}|${aw}`;
    if (!matchForfeit.has(key)) matchForfeit.set(key, ft);
  }

  const teamIds = new Map<string, number>();
  const playerIds = new Map<string, number>();
  const matchIds = new Map<string, number>();

  const teamId = async (name: string): Promise<number> => {
    const key = name.trim();
    if (teamIds.has(key)) return teamIds.get(key)!;
    await db.prepare('INSERT INTO teams (name, short_name) VALUES (?, ?) ON CONFLICT(name) DO NOTHING').bind(key, key).run();
    const res = await db.prepare('SELECT id FROM teams WHERE name = ?').bind(key).first<{ id: number }>();
    const id = res?.id ?? 0;
    teamIds.set(key, id);
    report.teams += 1;
    return id;
  };

  const playerId = async (team: number, name: string, number: string): Promise<number> => {
    const key = `${team}|${name}|${number}`;
    if (playerIds.has(key)) return playerIds.get(key)!;
    const num = parseInt(number, 10);
    const numberVal = Number.isNaN(num) ? 0 : num;
    await db.prepare('INSERT INTO players (team_id, name, number) VALUES (?, ?, ?) ON CONFLICT(team_id, name, number) DO NOTHING').bind(team, name.trim(), numberVal).run();
    const res = await db.prepare('SELECT id FROM players WHERE team_id = ? AND name = ? AND number = ?').bind(team, name.trim(), numberVal).first<{ id: number }>();
    const id = res?.id ?? 0;
    playerIds.set(key, id);
    report.players += 1;
    return id;
  };

  const matchId = async (week: string, home: number, away: number, date: string, time: string | null, homeScore: number, awayScore: number, status: string, forfeitTeamId: number | null): Promise<number> => {
    const key = `${week}|${home}|${away}`;
    if (matchIds.has(key)) return matchIds.get(key)!;
    await db
      .prepare(
        'INSERT INTO matches (week, date, time, home_team_id, away_team_id, home_score, away_score, status, forfeit_team_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(week, home_team_id, away_team_id) DO UPDATE SET date = excluded.date, time = excluded.time, home_score = excluded.home_score, away_score = excluded.away_score, status = excluded.status, forfeit_team_id = excluded.forfeit_team_id'
      )
      .bind(week, date, time, home, away, homeScore, awayScore, status, forfeitTeamId)
      .run();
    const res = await db.prepare('SELECT id FROM matches WHERE week = ? AND home_team_id = ? AND away_team_id = ?').bind(week, home, away).first<{ id: number }>();
    const id = res?.id ?? 0;
    matchIds.set(key, id);
    report.matches += 1;
    return id;
  };

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const get = (name: string): string => (row[idx[name]] ?? '').trim();
    const week = get('week');
    const date = get('date');
    const time = get('time') || null;
    const homeTeam = get('home_team');
    const awayTeam = get('away_team');
    const status = get('status') || 'finished';
    const team = get('team');
    const forfeitTeam = matchForfeit.get(`${week}|${homeTeam}|${awayTeam}`) ?? '';

    if (!week || !date || !homeTeam || !awayTeam) {
      report.skipped += 1;
      report.errors.push(`Fila ${r + 1}: falta week/date/equipos.`);
      continue;
    }
    const homeScore = parseInt(get('home_score'), 10);
    const awayScore = parseInt(get('away_score'), 10);
    if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
      report.skipped += 1;
      report.errors.push(`Fila ${r + 1} (${homeTeam} vs ${awayTeam}): marcadores no numéricos.`);
      continue;
    }
    if (!(team === homeTeam || team === awayTeam)) {
      report.skipped += 1;
      report.errors.push(`Fila ${r + 1}: 'team' (${team}) no coincide con home_team/away_team.`);
      continue;
    }
    const stats: Record<string, number> = {};
    for (const col of ['points', '2pm', '3pm', 'ftm', 'fta', 'fouls']) {
      const v = parseInt(get(col), 10);
      stats[col] = Number.isNaN(v) ? 0 : v;
    }

    const homeId = await teamId(homeTeam);
    const awayId = await teamId(awayTeam);

    let matchStatus = status;
    let forfeitTeamId: number | null = null;
    if (forfeitTeam) {
      if (!(forfeitTeam === homeTeam || forfeitTeam === awayTeam)) {
        report.skipped += 1;
        report.errors.push(`Fila ${r + 1}: 'forfeit_team' (${forfeitTeam}) no coincide con home_team/away_team.`);
        continue;
      }
      matchStatus = 'forfeit';
      forfeitTeamId = forfeitTeam === homeTeam ? homeId : awayId;
    }

    const teamIdRow = team === homeTeam ? homeId : awayId;
    const playerName = get('player');

    if (!playerName) {
      report.skipped += 1;
      report.errors.push(`Fila ${r + 1}: falta jugador.`);
      continue;
    }
    const player = await playerId(teamIdRow, playerName, get('number'));
    const match = await matchId(week, homeId, awayId, date, time, homeScore, awayScore, matchStatus, forfeitTeamId);

    const res = await db
      .prepare(
        `INSERT INTO match_stats (match_id, player_id, points, fouls, field_goals_made, three_pt_made, free_throws_made, free_throws_attempted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(match_id, player_id) DO UPDATE SET
           points = excluded.points, fouls = excluded.fouls,
           field_goals_made = excluded.field_goals_made,
           three_pt_made = excluded.three_pt_made, free_throws_made = excluded.free_throws_made,
           free_throws_attempted = excluded.free_throws_attempted`
      )
      .bind(match, player, stats['points'], stats['fouls'], stats['2pm'], stats['3pm'], stats['ftm'], stats['fta'])
      .run();
    if (res.meta.changes > 0) report.matchStats += 1;
  }

  const del = db.prepare('DELETE FROM standings');
  const ins = db.prepare(
    `INSERT INTO standings (team_id, played, wins, losses, points_for, points_against, points)
     SELECT team_id, COUNT(*) AS played, SUM(wins) AS wins, COUNT(*) - SUM(wins) AS losses,
            SUM(points_for) AS points_for, SUM(points_against) AS points_against, SUM(points) AS points
     FROM (
       SELECT home_team_id AS team_id, 1 AS played,
              CASE
                WHEN m.forfeit_team_id = m.home_team_id THEN 0
                WHEN m.forfeit_team_id IS NOT NULL THEN 1
                WHEN m.home_score > m.away_score THEN 1 ELSE 0
              END AS wins,
              CASE
                WHEN m.forfeit_team_id = m.home_team_id THEN 0
                WHEN m.forfeit_team_id IS NOT NULL THEN 2
                WHEN m.home_score > m.away_score THEN 2 ELSE 1
              END AS points,
              home_score AS points_for, away_score AS points_against
       FROM matches m WHERE m.status IN ('finished', 'forfeit')
       UNION ALL
       SELECT away_team_id AS team_id, 1 AS played,
              CASE
                WHEN m.forfeit_team_id = m.away_team_id THEN 0
                WHEN m.forfeit_team_id IS NOT NULL THEN 1
                WHEN m.away_score > m.home_score THEN 1 ELSE 0
              END AS wins,
              CASE
                WHEN m.forfeit_team_id = m.away_team_id THEN 0
                WHEN m.forfeit_team_id IS NOT NULL THEN 2
                WHEN m.away_score > m.home_score THEN 2 ELSE 1
              END AS points,
              away_score AS points_for, home_score AS points_against
       FROM matches m WHERE m.status IN ('finished', 'forfeit')
     ) GROUP BY team_id`
  );
  await db.batch([del, ins]);
  report.standings = true;

  report.ok = report.skipped === 0 && report.errors.length === 0;
  return report;
}