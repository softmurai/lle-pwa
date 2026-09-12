import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TEAMS = [
  'Cebras', 'Auroras', 'Dragones', 'Fulgor', 'Toros',
  'Halcones', 'Lobos', 'Mineros', 'Vikingos',
];

const FIRST_NAMES = [
  'Marc', 'Adrià', 'Iker', 'Pau', 'Álvaro', 'Dani', 'Javier', 'Sergio', 'Mario', 'Rubén',
  'Carlos', 'Guillem', 'Pablo', 'Nacho', 'César', 'Bruno', 'Éric', 'Hugo', 'Lucas', 'Nico',
];

const SURNAMES = [
  'García', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez',
  'Martín', 'Jiménez', 'Ruiz', 'Moreno', 'Torres', 'Ramírez', 'Navarro', 'Serrano',
  'Vidal', 'Castro', 'Ortega', 'Molina',
];

const POSITIONS = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20260912);
const rand = (min, max) => Math.floor(rng() * (max - min + 1)) + min;

const teams = TEAMS.map((name) => {
  const usedNames = new Set();
  const players = [];
  let pick = 0;
  while (players.length < 15) {
    const first = FIRST_NAMES[rand(0, FIRST_NAMES.length - 1)];
    const surname = SURNAMES[rand(0, SURNAMES.length - 1)];
    const full = `${first} ${surname}`;
    if (usedNames.has(full)) continue;
    usedNames.add(full);
    players.push({
      name: full,
      number: 4 + players.length,
      position: POSITIONS[Math.floor(players.length / 3)],
    });
  }
  void pick;
  return { name, players };
});

const weeks = ['2026-09-19', '2026-09-26', '2026-10-03'];

const matchups = [];
{
  const arr = [...teams];
  for (let r = 0; r < weeks.length; r++) {
    for (let i = 0; i < Math.floor(arr.length / 2); i++) {
      matchups.push([arr[i], arr[arr.length - 1 - i]]);
    }
    const last = arr.pop();
    arr.splice(1, 0, last);
  }
}

const headers = [
  'week', 'date', 'home_team', 'away_team', 'home_score', 'away_score', 'status',
  'team', 'player', 'number', 'points', 'rebounds', 'assists', 'steals',
  'blocks', 'turnovers', 'fouls', '2pm', '3pm', 'ftm', 'fta',
];

function teamBoxScores(playerCount) {
  const target = rand(68, 92);
  const weights = Array.from({ length: playerCount }, () => rand(1, 12));
  const totalW = weights.reduce((s, w) => s + w, 0);
  let assigned = 0;
  const rawPoints = weights.map((w) => {
    const p = Math.floor((target * w) / totalW);
    assigned += p;
    return p;
  });
  let leftover = target - assigned;
  let i = 0;
  while (leftover > 0) {
    rawPoints[i % playerCount] += 1;
    leftover -= 1;
    i += 1;
  }
  return rawPoints.map((points) => {
    const three_pt_made = rand(0, Math.min(6, Math.floor(points / 3)));
    let rest = points - three_pt_made * 3;
    const field_goals_made = rand(0, Math.min(10, Math.floor(rest / 2)));
    rest -= field_goals_made * 2;
    const free_throws_made = rest;
    const free_throws_attempted = free_throws_made + (rng() < 0.25 ? rand(1, 2) : 0);
    return {
      points,
      rebounds: rand(0, 12),
      assists: rand(0, 9),
      steals: rand(0, 4),
      blocks: rand(0, 3),
      turnovers: rand(0, 5),
      fouls: rand(0, 5),
      field_goals_made,
      three_pt_made,
      free_throws_made,
      free_throws_attempted,
    };
  });
}

const rows = [];
matchups.forEach(([home, away], idx) => {
  const week = idx >= weeks.length * 4 ? 3 : weeks.length * 4 > 0 ? Math.floor(idx / 4) + 1 : 1;
  const date = weeks[week - 1];
  const homeScores = teamBoxScores(home.players.length);
  const awayScores = teamBoxScores(away.players.length);
  const homeTotal = homeScores.reduce((s, b) => s + b.points, 0);
  const awayTotal = awayScores.reduce((s, b) => s + b.points, 0);
  for (let p = 0; p < home.players.length; p++) {
    rows.push([week, date, home.name, away.name, homeTotal, awayTotal, 'finished', home.name, home.players[p].name, home.players[p].number, ...statFields(homeScores[p])]);
  }
  for (let p = 0; p < away.players.length; p++) {
    rows.push([week, date, home.name, away.name, homeTotal, awayTotal, 'finished', away.name, away.players[p].name, away.players[p].number, ...statFields(awayScores[p])]);
  }
});

function statFields(b) {
  return [
    b.points, b.rebounds, b.assists, b.steals, b.blocks,
    b.turnovers, b.fouls, b.field_goals_made, b.three_pt_made,
    b.free_throws_made, b.free_throws_attempted,
  ];
}

const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n') + '\n';

const outDir = join(__dirname, '..', 'public', 'data');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'sample.csv'), csv, 'utf8');

const matchCount = matchups.length;
const playerRows = rows.length;
console.log(`Escrito public/data/sample.csv`);
console.log(`Equipos: ${teams.length} | Jugadores/equipo: 15 | Jornadas: ${weeks.length} | Partidos: ${matchCount}`);
console.log(`Filas de estadísticas: ${playerRows}`);