export function formatDate(date: string): string {
	const d = new Date(`${date}T12:00:00`);
	if (Number.isNaN(d.getTime())) return date;
	return d.toLocaleDateString('es-ES', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
	});
}

export const headerTips: Record<string, string> = {
	PJ: 'Partidos jugados',
	V: 'Victorias',
	D: 'Derrotas',
	NP: 'No presentado',
	PF: 'Puntos a favor',
	PC: 'Puntos en contra',
	'+/-': 'Diferencia de puntos',
	PTS: 'Puntos',
	P: 'Puntos',
	'Pts/PJ': 'Puntos por partido',
	'2P': 'Tiros de 2 anotados',
	'3P': 'Triples anotados',
	TL: 'Tiros libres anotados',
	TLA: 'Tiros libres intentados',
	'TL%': 'Porcentaje de tiros libres',
	Fal: 'Faltas',
	RACHA: 'Últimos 5 partidos',
};

export function formatTime(time: string | null | undefined): string {
	if (!time) return '';
	const [h, m] = time.split(':');
	const hour = parseInt(h, 10);
	if (Number.isNaN(hour)) return time;
	return `${hour}:${m ?? '00'}h`;
}

export type TeamOutcome = 'win' | 'loss' | 'forfeit';

export interface TeamOutcomeInput {
	status: string;
	home_id: number;
	away_id: number;
	forfeit_team_id: number | null;
	home_score: number | null;
	away_score: number | null;
}

export function teamOutcome(input: TeamOutcomeInput, side: 'home' | 'away'): TeamOutcome | null {
	const forfeited =
		input.status === 'forfeit' &&
		input.forfeit_team_id === (side === 'home' ? input.home_id : input.away_id);
	if (forfeited) return 'forfeit';
	const mine = side === 'home' ? input.home_score : input.away_score;
	const theirs = side === 'home' ? input.away_score : input.home_score;
	if (mine == null || theirs == null) return null;
	if (mine > theirs) return 'win';
	if (mine < theirs) return 'loss';
	return null;
}