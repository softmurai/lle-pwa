import { useCallback, useEffect, useState } from 'react';
import { useUnsavedChanges } from './use-unsaved-changes';

interface Venue {
	id: number;
	name: string;
	short_name: string;
	maps_url: string | null;
}

interface SpecialDate {
	date: string;
	type: string;
	detail: string | null;
}

interface ConflictMatch {
	id: number;
	week: number;
	date: string;
	time: string | null;
	home_team: string;
	away_team: string;
}

interface MatchRow {
	id: number;
	week: number;
	date: string;
	time: string | null;
	home_team: string;
	home_short: string;
	away_team: string;
	away_short: string;
	home_id: number;
	away_id: number;
	venue_id: number | null;
	venue_name: string | null;
	venue_short: string | null;
	original_date: string | null;
	status: string;
}

interface Props {
	week: number;
	matches: MatchRow[];
	venues: Venue[];
	specialDates: SpecialDate[];
}

const fmtDate = (iso: string) =>
	new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
	});

const today = () => new Date().toISOString().slice(0, 10);

export default function ScheduleBoard({ matches: initial, venues, specialDates }: Props) {
	const [matches, setMatches] = useState<MatchRow[]>(initial);
	const [dirtyIds, setDirtyIds] = useState<Set<number>>(() => new Set());

	function updateMatch(id: number, patch: Partial<MatchRow>) {
		setMatches((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
	}

	const handleDirtyChange = useCallback((id: number, dirty: boolean) => {
		setDirtyIds((prev) => {
			if (dirty === prev.has(id)) return prev;
			const next = new Set(prev);
			if (dirty) next.add(id);
			else next.delete(id);
			return next;
		});
	}, []);

	useUnsavedChanges(dirtyIds.size > 0);

	return (
		<div className="space-y-4">
			{matches.length === 0 && (
				<p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-500">
					No hay partidos en esta jornada.
				</p>
			)}
			{matches.map((m) => (
				<MatchCard
					key={m.id}
					match={m}
					venues={venues}
					specialDates={specialDates}
					onSaved={updateMatch}
					onDirtyChange={handleDirtyChange}
				/>
			))}
		</div>
	);
}

function MatchCard({
	match,
	venues,
	specialDates,
	onSaved,
	onDirtyChange,
}: {
	match: MatchRow;
	venues: Venue[];
	specialDates: SpecialDate[];
	onSaved: (id: number, patch: Partial<MatchRow>) => void;
	onDirtyChange: (id: number, dirty: boolean) => void;
}) {
	const [date, setDate] = useState(match.date);
	const [time, setTime] = useState(match.time ?? '');
	const [venueId, setVenueId] = useState<number | null>(match.venue_id);
	const [mode, setMode] = useState<'idle' | 'postpone'>('idle');
	const [conflicts, setConflicts] = useState<{ teams: ConflictMatch[]; venue: ConflictMatch[]; special: SpecialDate[] } | null>(null);
	const [checking, setChecking] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);

	const dirty = date !== match.date || time !== (match.time ?? '') || venueId !== match.venue_id;

	useEffect(() => {
		onDirtyChange(match.id, dirty);
	}, [dirty, match.id, onDirtyChange]);

	const rainDates = specialDates.filter((s) => s.type === 'lluvia' && s.date >= today());
	const moved = !!match.original_date;
	const movedLabel = match.original_date
		? date < match.original_date
			? 'Adelantado'
			: 'Aplazado'
		: null;

	async function checkConflicts(candidateDate: string, candidateTime: string, candidateVenue: number | null) {
		setChecking(true);
		try {
			const res = await fetch('/api/admin/jornadas/conflicts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ matchId: match.id, date: candidateDate, time: candidateTime || null, venueId: candidateVenue }),
			});
			if (res.ok) {
				const data = (await res.json()) as {
					teamConflicts: ConflictMatch[];
					venueConflicts: ConflictMatch[];
					special: SpecialDate[];
				};
				setConflicts({ teams: data.teamConflicts, venue: data.venueConflicts, special: data.special });
			}
		} finally {
			setChecking(false);
		}
	}

	async function save(endpoint: 'schedule' | 'postpone') {
		setSaving(true);
		setError(null);
		setNotice(null);
		try {
			const res = await fetch(`/api/admin/matches/${match.id}/${endpoint}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ date, time: time || null, venueId }),
			});
			if (res.status === 409) {
				const data = (await res.json()) as {
					teamConflicts: ConflictMatch[];
					venueConflicts: ConflictMatch[];
				};
				setConflicts({ teams: data.teamConflicts, venue: data.venueConflicts, special: [] });
				setError('Hay conflictos: no se puede guardar. Ajusta la fecha, la hora o la sede.');
				return;
			}
			if (!res.ok) {
				const data = (await res.json().catch(() => ({}))) as { error?: string };
				throw new Error(data.error ?? 'No se pudo guardar');
			}
			const venue = venues.find((v) => v.id === venueId) ?? null;
			onSaved(match.id, {
				date,
				time: time || null,
				venue_id: venueId,
				venue_name: venue?.name ?? null,
				venue_short: venue?.short_name ?? null,
				original_date: date !== match.date ? (match.original_date ?? match.date) : match.original_date,
			});
			setMode('idle');
			setConflicts(null);
			setNotice('Guardado ✓');
			setTimeout(() => setNotice(null), 2500);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudo guardar');
		} finally {
			setSaving(false);
		}
	}

	function reset() {
		setDate(match.date);
		setTime(match.time ?? '');
		setVenueId(match.venue_id);
		setMode('idle');
		setConflicts(null);
		setError(null);
	}

	const conflictCount = conflicts ? conflicts.teams.length + conflicts.venue.length : 0;

	return (
		<div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<div className="flex items-center gap-2">
						<span className="font-medium text-gray-900">{match.home_team}</span>
						<span className="text-gray-400">vs</span>
						<span className="font-medium text-gray-900">{match.away_team}</span>
						{moved && (
							<span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
								{movedLabel} desde {fmtDate(match.original_date!)}
							</span>
						)}
					</div>
					<p className="mt-1 text-sm text-gray-500">
						Actualmente: <span className="font-medium text-gray-700">{fmtDate(match.date)}</span>
						{match.time ? ` · ${match.time}` : ''}
						{match.venue_name ? ` · ${match.venue_name}` : ''}
					</p>
				</div>
			</div>

			{mode === 'idle' ? (
				<div className="mt-4 flex flex-wrap items-end gap-3">
					<label className="text-sm">
						<span className="mb-1 block text-xs text-gray-500">Fecha</span>
						<input
							type="date"
							value={date}
							onChange={(e) => setDate(e.target.value)}
							className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-[#641B24] focus:outline-none"
						/>
					</label>
					<label className="text-sm">
						<span className="mb-1 block text-xs text-gray-500">Hora</span>
						<input
							type="time"
							value={time}
							onChange={(e) => setTime(e.target.value)}
							className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-[#641B24] focus:outline-none"
						/>
					</label>
					<label className="text-sm">
						<span className="mb-1 block text-xs text-gray-500">Sede</span>
						<select
							value={venueId ?? ''}
							onChange={(e) => setVenueId(e.target.value ? Number(e.target.value) : null)}
							className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-[#641B24] focus:outline-none"
						>
							<option value="">— Sin sede —</option>
							{venues.map((v) => (
								<option key={v.id} value={v.id}>
									{v.name}
								</option>
							))}
						</select>
					</label>
					<button
						type="button"
						disabled={!dirty || saving}
						onClick={() => save('schedule')}
						className="rounded-lg bg-[#641B24] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#7a2130] disabled:opacity-40"
					>
						Guardar cambios
					</button>
					<button
						type="button"
						onClick={() => {
							setMode('postpone');
							checkConflicts(date, time, venueId);
						}}
						className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100"
					>
						Aplazar…
					</button>
				</div>
			) : (
				<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
					<p className="text-sm font-medium text-amber-900">Aplazar partido</p>
					<div className="mt-3 flex flex-wrap items-end gap-3">
						<label className="text-sm">
							<span className="mb-1 block text-xs text-gray-600">Nueva fecha</span>
							<input
								type="date"
								value={date}
								onChange={(e) => {
									setDate(e.target.value);
									checkConflicts(e.target.value, time, venueId);
								}}
								className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-[#641B24] focus:outline-none"
							/>
						</label>
						<label className="text-sm">
							<span className="mb-1 block text-xs text-gray-600">Hora</span>
							<input
								type="time"
								value={time}
								onChange={(e) => setTime(e.target.value)}
								className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-[#641B24] focus:outline-none"
							/>
						</label>
						<button
							type="button"
							onClick={() => checkConflicts(date, time, venueId)}
							className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
						>
							{checking ? 'Comprobando…' : 'Comprobar conflictos'}
						</button>
					</div>

					{rainDates.length > 0 && (
						<div className="mt-3">
							<p className="text-xs text-gray-600">Fechas reservadas para lluvia:</p>
							<div className="mt-1 flex flex-wrap gap-2">
								{rainDates.map((r) => (
									<button
										key={r.date}
										type="button"
										onClick={() => {
											setDate(r.date);
											checkConflicts(r.date, time, venueId);
										}}
										className={`rounded-full border px-3 py-1 text-xs ${
											date === r.date
												? 'border-[#641B24] bg-[#641B24] text-white'
												: 'border-gray-300 bg-white hover:bg-gray-50'
										}`}
									>
										{fmtDate(r.date)}
									</button>
								))}
							</div>
						</div>
					)}

					{conflicts && (
						<div className="mt-3 space-y-1 text-sm">
							{conflicts.special.length > 0 && (
								<p className="text-amber-700">
									⚠ Fecha especial: {conflicts.special.map((s) => s.detail ?? s.type).join(', ')}
								</p>
							)}
							{conflicts.teams.map((c) => (
								<p key={`t-${c.id}`} className="text-red-600">
									⚠ Jornada {c.week}: {c.home_team} vs {c.away_team} ya juegan ese día
									{c.time ? ` (${c.time})` : ''}
								</p>
							))}
							{conflicts.venue.map((c) => (
								<p key={`v-${c.id}`} className="text-red-600">
									⚠ Sede ocupada: {c.home_team} vs {c.away_team} a la misma hora
								</p>
							))}
							{conflictCount === 0 && conflicts.special.length === 0 && (
								<p className="text-green-600">✓ Sin conflictos</p>
							)}
						</div>
					)}

					<div className="mt-4 flex flex-wrap items-center gap-2">
						<button
							type="button"
							disabled={saving || conflictCount > 0}
							onClick={() => save('postpone')}
							className="rounded-lg bg-[#641B24] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#7a2130] disabled:opacity-40"
						>
							{saving ? 'Guardando…' : 'Confirmar aplazamiento'}
						</button>
						{conflictCount > 0 && (
							<span className="text-sm text-red-600">
								Resuelve los conflictos para poder aplazar.
							</span>
						)}
						<button
							type="button"
							onClick={reset}
							className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50"
						>
							Cancelar
						</button>
					</div>
				</div>
			)}

			{error && <p className="mt-3 text-sm text-red-600">{error}</p>}
			{notice && <p className="mt-3 text-sm text-green-600">{notice}</p>}
		</div>
	);
}
