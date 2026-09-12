export function formatDate(date: string): string {
	const d = new Date(`${date}T12:00:00`);
	if (Number.isNaN(d.getTime())) return date;
	return d.toLocaleDateString('es-ES', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
	});
}