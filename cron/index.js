// Reloj: sábados 20:00 hora de Madrid (UTC+2 en verano -> cron 0 18 * * 6).
// De octubre a marzo (CET, UTC+1) dispara a las 19:00 UTC; ajustar el cron entonces.
export default {
	async scheduled(_event, env) {
		const res = await fetch(`${env.APP_URL}/api/import`, {
			method: 'POST',
			headers: { 'x-import-secret': env.IMPORT_SECRET },
		});
		if (!res.ok) {
			console.error(`Import cron -> HTTP ${res.status}`);
			return;
		}
		console.log(`Import cron -> OK`);
	},
};