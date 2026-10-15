import { useEffect, useMemo, useState } from 'react';
import {
	type MatchResultInput,
	type MatchStatus,
	type PlayerStatInput,
	type QuarterScores,
	pointsOf,
	validateMatchResult,
	issuesByPath,
	MAX_PLAYERS,
} from '../../lib/validation/match-acta';
import { useUnsavedChanges } from './use-unsaved-changes';

interface TeamPlayer {
	id: number;
	name: string;
	number: string | null;
}

interface MatchProps {
	id: number;
	week: number;
	date: string;
	time: string | null;
	home_id: number;
	home_team: string;
	home_short: string;
	away_id: number;
	away_team: string;
	away_short: string;
	status: string;
	home_score: number | null;
	away_score: number | null;
	forfeit_team_id: number | null;
	observations: string | null;
	acta_photo_key: string | null;
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
}

interface StatRow {
	player_id: number;
	points: number;
	fg2: number;
	fg3: number;
	ftm: number;
	fta: number;
	fouls: number;
}

interface Props {
	match: MatchProps;
	homePlayers: TeamPlayer[];
	awayPlayers: TeamPlayer[];
	stats: StatRow[];
}

interface RowState {
	player: TeamPlayer;
	played: boolean;
	fg2: string;
	fg3: string;
	ftm: string;
	fta: string;
	fouls: string;
}

type Side = 'home' | 'away';

const blankScores = (): Record<'q1' | 'q2' | 'q3' | 'q4' | 'ot1' | 'ot2' | 'ot3', string> => ({
	q1: '',
	q2: '',
	q3: '',
	q4: '',
	ot1: '',
	ot2: '',
	ot3: '',
});

const toNum = (s: string): number => {
	const n = Number.parseInt(s, 10);
	return Number.isFinite(n) && n >= 0 ? n : 0;
};
const toIntOrNull = (s: string): number | null => (s.trim() === '' ? null : toNum(s));

function buildRows(players: TeamPlayer[], stats: StatRow[]): RowState[] {
	const byId = new Map(stats.map((s) => [s.player_id, s]));
	const existing = stats.length > 0;
	let checked = 0;
	return players.map((p) => {
		const s = byId.get(p.id);
		// Pre-check the first MAX_PLAYERS by roster order when there is no acta yet.
		const played = existing ? !!s : checked < MAX_PLAYERS;
		if (played && !existing) checked++;
		return {
			player: p,
			played,
			fg2: s ? String(s.fg2) : '',
			fg3: s ? String(s.fg3) : '',
			ftm: s ? String(s.ftm) : '',
			fta: s ? String(s.fta) : '',
			fouls: s ? String(s.fouls) : '',
		};
	});
}

export default function ActaForm({ match, homePlayers, awayPlayers, stats }: Props) {
	const homeStats = stats.filter((s) => homePlayers.some((p) => p.id === s.player_id));
	const awayStats = stats.filter((s) => awayPlayers.some((p) => p.id === s.player_id));

	// Initial status: map stored status to the form's vocabulary.
	const initialStatus: MatchStatus =
		match.status === 'forfeit'
			? 'forfeit'
			: match.status === 'cancelled'
				? 'cancelled'
				: match.status === 'postponed'
					? 'postponed'
					: 'finished';

	const [status, setStatus] = useState<MatchStatus>(initialStatus);
	const [forfeitTeamId, setForfeitTeamId] = useState<number | null>(match.forfeit_team_id);
	const [observations, setObservations] = useState(match.observations ?? '');
	const [photoKey, setPhotoKey] = useState<string | null>(match.acta_photo_key);
	const [photoUploading, setPhotoUploading] = useState(false);

	const [scores, setScores] = useState({
		home: {
			...blankScores(),
			q1: match.home_q1 != null ? String(match.home_q1) : '',
			q2: match.home_q2 != null ? String(match.home_q2) : '',
			q3: match.home_q3 != null ? String(match.home_q3) : '',
			q4: match.home_q4 != null ? String(match.home_q4) : '',
			ot1: match.home_ot1 != null ? String(match.home_ot1) : '',
			ot2: match.home_ot2 != null ? String(match.home_ot2) : '',
			ot3: match.home_ot3 != null ? String(match.home_ot3) : '',
		},
		away: {
			...blankScores(),
			q1: match.away_q1 != null ? String(match.away_q1) : '',
			q2: match.away_q2 != null ? String(match.away_q2) : '',
			q3: match.away_q3 != null ? String(match.away_q3) : '',
			q4: match.away_q4 != null ? String(match.away_q4) : '',
			ot1: match.away_ot1 != null ? String(match.away_ot1) : '',
			ot2: match.away_ot2 != null ? String(match.away_ot2) : '',
			ot3: match.away_ot3 != null ? String(match.away_ot3) : '',
		},
	});

	const initialOtCount = Math.max(
		[1, 2, 3].filter((i) => [match.home_ot1, match.home_ot2, match.home_ot3][i - 1] != null).length,
		[1, 2, 3].filter((i) => [match.away_ot1, match.away_ot2, match.away_ot3][i - 1] != null).length,
	);
	const [otVisible, setOtVisible] = useState(initialOtCount);

	const [rows, setRows] = useState<{ home: RowState[]; away: RowState[] }>({
		home: buildRows(homePlayers, homeStats),
		away: buildRows(awayPlayers, awayStats),
	});

	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);

	function setScore(side: Side, key: keyof QuarterScores, value: string) {
		setScores((prev) => ({ ...prev, [side]: { ...prev[side], [key]: value.replace(/[^0-9]/g, '') } }));
	}

	function updateRow(side: Side, playerId: number, patch: Partial<RowState>) {
		setRows((prev) => ({
			...prev,
			[side]: prev[side].map((r) => (r.player.id === playerId ? { ...r, ...patch } : r)),
		}));
	}

	function togglePlayed(side: Side, playerId: number, played: boolean) {
		updateRow(side, playerId, played ? { played } : { played, fg2: '', fg3: '', ftm: '', fta: '', fouls: '' });
	}

	const homeScore = useMemo(() => {
		const s = scores.home;
		return toNum(s.q1) + toNum(s.q2) + toNum(s.q3) + toNum(s.q4) + toNum(s.ot1) + toNum(s.ot2) + toNum(s.ot3);
	}, [scores.home]);
	const awayScore = useMemo(() => {
		const s = scores.away;
		return toNum(s.q1) + toNum(s.q2) + toNum(s.q3) + toNum(s.q4) + toNum(s.ot1) + toNum(s.ot2) + toNum(s.ot3);
	}, [scores.away]);

	function buildInput(resultOnly = false): MatchResultInput {
		const scoresToObj = (s: Record<string, string>): QuarterScores => ({
			q1: toIntOrNull(s.q1),
			q2: toIntOrNull(s.q2),
			q3: toIntOrNull(s.q3),
			q4: toIntOrNull(s.q4),
			ot1: otVisible >= 1 ? toIntOrNull(s.ot1) : null,
			ot2: otVisible >= 2 ? toIntOrNull(s.ot2) : null,
			ot3: otVisible >= 3 ? toIntOrNull(s.ot3) : null,
		});
		const rowsToStats = (rs: RowState[]): PlayerStatInput[] =>
			rs.map((r) => ({
				player_id: r.player.id,
				played: r.played,
				fg2: toNum(r.fg2),
				fg3: toNum(r.fg3),
				ftm: toNum(r.ftm),
				fta: toNum(r.fta),
				fouls: toNum(r.fouls),
			}));
		return {
			status,
			forfeit_team_id: status === 'forfeit' ? forfeitTeamId : null,
			home: scoresToObj(scores.home),
			away: scoresToObj(scores.away),
			home_stats: rowsToStats(rows.home),
			away_stats: rowsToStats(rows.away),
			observations: observations.trim() || null,
			acta_photo_key: photoKey,
			resultOnly,
		};
	}

	const input = buildInput();
	const result = validateMatchResult(input, {
		homeId: match.home_id,
		awayId: match.away_id,
		homePlayers: homePlayers.map((p) => p.id),
		awayPlayers: awayPlayers.map((p) => p.id),
	});
	const issues = issuesByPath(result);

	// "Result only": scores filled but no player statistics entered yet. The main
	// save button stays enabled and warns that it will store the scoreline alone.
	const statsEmpty = [...rows.home, ...rows.away].every(
		(r) => toNum(r.fg2) === 0 && toNum(r.fg3) === 0 && toNum(r.ftm) === 0 && toNum(r.fta) === 0 && toNum(r.fouls) === 0,
	);
	const resultOnlyInput = buildInput(true);
	const resultOnlyResult = validateMatchResult(resultOnlyInput, {
		homeId: match.home_id,
		awayId: match.away_id,
		homePlayers: homePlayers.map((p) => p.id),
		awayPlayers: awayPlayers.map((p) => p.id),
	});
	const showResultOnly = status === 'finished' && statsEmpty && resultOnlyResult.ok;

	const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(input));
	const dirty = JSON.stringify(input) !== savedSnapshot;
	useUnsavedChanges(dirty);

	const [redirecting, setRedirecting] = useState(false);
	useEffect(() => {
		if (redirecting && !dirty) window.location.href = `/admin/actas/${match.week}`;
	}, [redirecting, dirty, match.week]);

	const busy = saving || photoUploading;
	const canSaveFull = result.ok && !busy;
	const canSaveResultOnly = showResultOnly && !busy;
	const canSave = canSaveFull || canSaveResultOnly;
	const saveLabel =
		showResultOnly && !canSaveFull ? '⚠️ Guardar solo resultado del partido' : 'Guardar acta';

	async function handlePhoto(file: File) {
		setPhotoUploading(true);
		setSaveError(null);
		try {
			const fd = new FormData();
			fd.append('photo', file);
			const res = await fetch(`/api/admin/matches/${match.id}/acta-photo`, {
				method: 'POST',
				body: fd,
			});
			if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? 'Error al subir la imagen');
			const data = (await res.json()) as { key: string };
			setPhotoKey(data.key);
		} catch (e) {
			setSaveError(e instanceof Error ? e.message : 'Error al subir la imagen');
		} finally {
			setPhotoUploading(false);
		}
	}

	async function handleSave() {
		const mode = canSaveFull ? 'full' : canSaveResultOnly ? 'resultOnly' : null;
		if (!mode) return;
		const payload = mode === 'resultOnly' ? resultOnlyInput : input;
		setSaving(true);
		setSaveError(null);
		setSaved(false);
		try {
			const res = await fetch(`/api/admin/matches/${match.id}/results`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (!res.ok) {
				const data = (await res.json().catch(() => ({}))) as { error?: string };
				throw new Error(data.error ?? 'No se pudo guardar el acta');
			}
			setSaved(true);
			setSavedSnapshot(JSON.stringify(input));
			setRedirecting(true);
		} catch (e) {
			setSaveError(e instanceof Error ? e.message : 'No se pudo guardar el acta');
		} finally {
			setSaving(false);
		}
	}

	// ---- styles -------------------------------------------------------
	const inputCompact =
		'w-full rounded-lg border px-0.5 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-[#641B24]/20 tabular-nums';
	const inputOk = 'border-gray-300 focus:border-[#641B24]';
	const inputBad = 'border-red-400 bg-red-50 text-red-900';
	const cls = (path: string) => `${inputCompact} ${issues.has(path) ? inputBad : inputOk} min-w-[2.75rem]`;

	return (
		<div className="space-y-6">
			{/* Status selector */}
			<section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
				<h2 className="font-display text-lg tracking-wide text-[#641B24]">Estado del partido</h2>
				<div className="mt-3 flex flex-wrap gap-4 text-sm">
					{(
						[
							['finished', 'Finalizado'],
							['forfeit', 'No presentado'],
							['cancelled', 'Cancelado'],
							['postponed', 'Aplazado'],
						] as const
					).map(([value, label]) => (
						<label key={value} className="flex cursor-pointer items-center gap-2">
							<input
								type="radio"
								name="status"
								value={value}
								checked={status === value}
								onChange={() => setStatus(value)}
								className="accent-[#641B24]"
							/>
							{label}
						</label>
					))}
				</div>

				{status === 'forfeit' && (
					<div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
						<p className="font-medium text-red-800">¿Qué equipo no se presentó?</p>
						<div className="mt-2 flex flex-wrap gap-4">
							<label className="flex cursor-pointer items-center gap-2">
								<input
									type="radio"
									name="forfeitTeam"
									checked={forfeitTeamId === match.home_id}
									onChange={() => setForfeitTeamId(match.home_id)}
									className="accent-[#641B24]"
								/>
								{match.home_team}
							</label>
							<label className="flex cursor-pointer items-center gap-2">
								<input
									type="radio"
									name="forfeitTeam"
									checked={forfeitTeamId === match.away_id}
									onChange={() => setForfeitTeamId(match.away_id)}
									className="accent-[#641B24]"
								/>
								{match.away_team}
							</label>
						</div>
						{issues.has('match.forfeit') && (
							<p className="mt-1 text-red-700">{issues.get('match.forfeit')}</p>
						)}
						<p className="mt-2 text-red-700">
							Se guardará como 20-0 y se borrarán las estadísticas.
						</p>
					</div>
				)}

				{(status === 'cancelled' || status === 'postponed') && (
					<p className="mt-3 text-sm text-amber-700">
						{status === 'postponed'
							? 'Se guardará como aplazado y se borrarán el resultado y las estadísticas. La fecha se gestiona en «Cambio de jornadas».'
							: 'Se guardará como cancelado y se borrarán el resultado y las estadísticas.'}
					</p>
				)}
			</section>

			{status === 'finished' && (
				<>
					{/* Scores */}
					<section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
						<div className="flex items-center justify-between">
							<h2 className="font-display text-lg tracking-wide text-[#641B24]">Anotación por cuartos</h2>
							<button
								type="button"
								onClick={() => setOtVisible((n) => Math.min(3, n + 1))}
								disabled={otVisible >= 3}
								className="rounded-lg border border-gray-300 px-3 py-1 text-sm transition-colors hover:bg-gray-50 disabled:opacity-40"
							>
								+ Prórroga
							</button>
						</div>
						<div className="mt-3 overflow-x-auto">
							<table className="w-full min-w-[320px] text-sm">
								<thead className="text-xs tracking-wide text-gray-500 uppercase">
									<tr>
										<th className="px-1 py-1 text-left">Equipo</th>
										<th className="px-1 py-1">1C</th>
										<th className="px-1 py-1">2C</th>
										<th className="px-1 py-1">3C</th>
										<th className="px-1 py-1">4C</th>
										{[1, 2, 3].slice(0, otVisible).map((i) => (
											<th key={i} className="px-1 py-1">OT{i}</th>
										))}
										<th className="px-1 py-1 border-l border-gray-200">Total</th>
									</tr>
								</thead>
								<tbody>
									{(
										[
											['home', match.home_team, homeScore],
											['away', match.away_team, awayScore],
										] as const
									).map(([side, team, total]) => (
										<tr key={side} className="border-t border-gray-100">
											<td className="px-1 py-1 text-left font-medium">{team}</td>
											{(['q1', 'q2', 'q3', 'q4'] as const).map((k) => (
												<td key={k} className="px-0.5 py-1">
													<input
														type="text"
														inputMode="numeric"
														value={scores[side][k]}
														onChange={(e) => setScore(side, k, e.target.value)}
														className={cls(`${side}.${k}`)}
													/>
												</td>
											))}
											{(['ot1', 'ot2', 'ot3'] as const).slice(0, otVisible).map((k) => (
												<td key={k} className="px-0.5 py-1">
													<input
														type="text"
														inputMode="numeric"
														value={scores[side][k]}
														onChange={(e) => setScore(side, k, e.target.value)}
														className={cls(`${side}.${k}`)}
													/>
												</td>
											))}
											<td className="border-l border-gray-200 px-1 py-1 text-center font-display text-xl tracking-wide text-[#641B24]">
												{total}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						{issues.has('match.tie') && (
							<p className="mt-2 text-sm font-medium text-red-600">{issues.get('match.tie')}</p>
						)}
						{issues.has('match.ot') && (
							<p className="mt-2 text-sm font-medium text-red-600">{issues.get('match.ot')}</p>
						)}
					</section>

					{/* Player stats */}
					<div className="space-y-6">
						{(
							[
								['home', match.home_team, rows.home],
								['away', match.away_team, rows.away],
							] as const
						).map(([side, team, sideRows]) => {
							const playedCount = sideRows.filter((r) => r.played).length;
							const sum = sideRows
								.filter((r) => r.played)
								.reduce((acc, r) => acc + pointsOf({ fg2: toNum(r.fg2), fg3: toNum(r.fg3), ftm: toNum(r.ftm) }), 0);
							const totalBad = issues.has(`${side}.total`);
							return (
								<section key={side} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
									<div className="flex items-baseline justify-between">
										<h2 className="font-display text-lg tracking-wide text-[#641B24]">{team}</h2>
										<span className="text-xs text-gray-500">
											{playedCount} jugadores presentados
										</span>
									</div>
									{issues.has(`${side}.players`) && (
										<p className="mt-1 text-xs text-red-600">{issues.get(`${side}.players`)}</p>
									)}
									<div className="mt-2 overflow-x-auto">
										<table className="w-full min-w-[300px] text-sm">
											<thead className="text-xs tracking-wide text-gray-500 uppercase">
												<tr>
													<th className="px-0.5 py-1 text-left">#</th>
													<th className="px-0.5 py-1 text-left">Jugador</th>
													<th className="px-0.5 py-1">Presentado</th>
													<th className="px-0.5 py-1" title="Canastas de 2P anotadas">2P</th>
													<th className="px-0.5 py-1" title="Triples anotados">3P</th>
													<th className="px-0.5 py-1" title="Tiros libres anotados">TLA</th>
													<th className="px-0.5 py-1" title="Tiros libres intentados">TLI</th>
													<th className="px-0.5 py-1">Faltas</th>
													<th className="px-0.5 py-1 border-l border-gray-200">Pts</th>
												</tr>
											</thead>
											<tbody>
												{sideRows.map((r) => {
													const pkey = `${side}.${r.player.id}`;
													const disabled = !r.played;
													const pts = pointsOf({
														fg2: toNum(r.fg2),
														fg3: toNum(r.fg3),
														ftm: toNum(r.ftm),
													});
													const fieldCls = (f: string) =>
														`${inputCompact} ${disabled ? 'bg-gray-100 text-gray-400' : issues.has(`${pkey}.${f}`) ? inputBad : inputOk} min-w-[2.5rem]`;
													return (
														<tr key={r.player.id} className={`border-t border-gray-100 ${r.played ? '' : 'text-gray-400'}`}>
															<td className="px-0.5 py-1 text-gray-500">{r.player.number ?? '—'}</td>
															<td className="px-0.5 py-1 whitespace-nowrap">{r.player.name}</td>
															<td className="px-0.5 py-1 text-center">
																<input
																	type="checkbox"
																	checked={r.played}
																	onChange={(e) => togglePlayed(side, r.player.id, e.target.checked)}
																	className="accent-[#641B24]"
																/>
															</td>
															{(['fg2', 'fg3', 'ftm', 'fta'] as const).map((f) => (
																<td key={f} className="px-0.5 py-1">
																	<input
																		type="text"
																		inputMode="numeric"
																		disabled={disabled}
																		value={r[f]}
																		onChange={(e) =>
																			updateRow(side, r.player.id, {
																				[f]: e.target.value.replace(/[^0-9]/g, ''),
																			} as Partial<RowState>)
																		}
																		className={fieldCls(f)}
																	/>
																</td>
															))}
															<td className="px-0.5 py-1">
																<select
																	disabled={disabled}
																	value={r.fouls === '' ? '0' : r.fouls}
																	onChange={(e) => updateRow(side, r.player.id, { fouls: e.target.value })}
																	aria-label={`Faltas de ${r.player.name}`}
																	className={`${inputCompact} ${disabled ? 'bg-gray-100 text-gray-400' : issues.has(`${pkey}.fouls`) ? inputBad : inputOk} min-w-[2.5rem]`}
																>
																	{[0, 1, 2, 3, 4, 5].map((n) => (
																		<option key={n} value={n}>
																			{n}
																		</option>
																	))}
																</select>
															</td>
															<td className="border-l border-gray-200 px-0.5 py-1 text-center font-medium tabular-nums">
																{pts}
															</td>
														</tr>
													);
												})}
											</tbody>
											<tfoot>
												<tr className="border-t-2 border-gray-200">
													<td
														colSpan={8}
														className={`px-0.5 py-2 text-right text-xs ${
															totalBad ? 'bg-red-50 font-medium text-red-700' : 'text-gray-500'
														}`}
													>
														Suma puntuación jugadores
													</td>
													<td
														className={`border-l border-gray-200 px-0.5 py-2 text-center font-display text-xl tracking-wide ${
															totalBad ? 'bg-red-50 text-red-600' : 'text-[#641B24]'
														}`}
													>
														{sum}
													</td>
												</tr>
											</tfoot>
										</table>
									</div>
									{issues.has(`${side}.total`) && (
										<p className="mt-1 text-xs text-red-600">{issues.get(`${side}.total`)}</p>
									)}
								</section>
							);
						})}
					</div>
				</>
			)}

			{/* Observations + photo */}
			<section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
				<h2 className="font-display text-lg tracking-wide text-[#641B24]">Observaciones</h2>
				<textarea
					rows={2}
					value={observations}
					onChange={(e) => setObservations(e.target.value)}
					placeholder="Incidencias, notas del acta…"
					className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#641B24] focus:ring-2 focus:ring-[#641B24]/20 focus:outline-none"
				/>

				<div className="mt-4 flex flex-wrap items-center gap-3">
					<label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-sm transition-colors hover:bg-gray-50">
						{photoUploading ? 'Subiendo…' : photoKey ? 'Cambiar foto del acta' : 'Subir foto del acta'}
						<input
							type="file"
							accept="image/*"
							className="hidden"
							onChange={(e) => {
								const f = e.target.files?.[0];
								if (f) handlePhoto(f);
							}}
						/>
					</label>
					{photoKey && (
						<a
							href={`/${photoKey}`}
							target="_blank"
							rel="noreferrer"
							className="text-sm text-[#641B24] hover:underline"
						>
							Ver foto actual
						</a>
					)}
				</div>
			</section>

			{/* Issues summary + actions */}
			<div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
				<div className="min-w-0 text-sm">
					{saveError && <p className="text-red-600">{saveError}</p>}
					{saved && <p className="text-green-600">✓ Acta guardada</p>}
					{!saveError && !saved && showResultOnly && (
						<p className="text-amber-600">
							Falta registrar las estadísticas de jugadores.
						</p>
					)}
					{!saveError && !saved && !showResultOnly && result.issues.length > 0 && (
						<p className="text-red-600">
							{result.issues.length === 1
								? result.issues[0].message
								: `${result.issues.length} problemas por resolver`}
						</p>
					)}
					{!saveError && !saved && !showResultOnly && result.issues.length === 0 && (
						<p className="text-gray-500">Todo correcto. Listo para guardar.</p>
					)}
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={handleSave}
						disabled={!canSave}
						className={
							showResultOnly && !canSaveFull
								? 'inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-5 py-2 font-medium text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40'
								: 'rounded-lg bg-[#641B24] px-6 py-2 font-medium text-white transition-colors hover:bg-[#7a2130] disabled:cursor-not-allowed disabled:opacity-40'
						}
					>
						{saving ? 'Guardando…' : saveLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
