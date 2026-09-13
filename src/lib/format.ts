export function formatDate(date: string): string {
	const d = new Date(`${date}T12:00:00`);
	if (Number.isNaN(d.getTime())) return date;
	return d.toLocaleDateString('es-ES', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
	});
}

export function formatTime(time: string | null | undefined): string {
	if (!time) return '';
	const [h, m] = time.split(':');
	const hour = parseInt(h, 10);
	if (Number.isNaN(hour)) return time;
	return `${hour}:${m ?? '00'}h`;
}