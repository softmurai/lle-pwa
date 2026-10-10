// Nombre completo cuando cabe; si no, se recurre al nombre corto.
const apply = () => {
	document.querySelectorAll<HTMLElement>('[data-name-full]').forEach((el) => {
		const full = el.dataset.nameFull;
		const short = el.dataset.nameShort ?? el.textContent ?? '';
		if (!full || full === short) return;
		el.textContent = full;
		if (el.scrollWidth > el.clientWidth) el.textContent = short;
	});
};

let timer: number | undefined;
const schedule = () => {
	window.clearTimeout(timer);
	timer = window.setTimeout(apply, 100);
};

document.addEventListener('DOMContentLoaded', () => {
	const run = () => {
		apply();
		window.addEventListener('resize', schedule);
	};
	if (document.fonts?.ready) {
		document.fonts.ready.then(run);
	} else {
		run();
	}
});
