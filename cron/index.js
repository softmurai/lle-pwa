// Reloj: sábados 23:59 hora de Madrid (UTC+2 en verano -> cron 59 21 * * 6).
// En octubre (CET, UTC+1) dispara una hora más tarde; ajustar a 59 22 * * 6 entonces.
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