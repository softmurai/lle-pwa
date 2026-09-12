const staggerRows = () => {
	document
		.querySelectorAll<HTMLTableSectionElement>('[data-animate-rows] tbody')
		.forEach((body) =>
			body.querySelectorAll<HTMLTableRowElement>('tr').forEach((row, i) => {
				row.style.animationDelay = `${Math.min(i * 25, 250)}ms`;
			}),
		);
};

document.addEventListener('DOMContentLoaded', () => {
	// Orden de tablas: clic en una columna con [data-sort]
	document
		.querySelectorAll<HTMLTableElement>('table[data-sortable]')
		.forEach((table) => {
			const body = table.querySelector('tbody');
			if (!body) return;
			const headers = Array.from(
				table.querySelectorAll<HTMLTableCellElement>('thead th[data-sort]'),
			);
			headers.forEach((th, i) => {
				th.addEventListener('click', () => {
					const asc = th.dataset.dir !== 'asc';
					const rows = Array.from(
						body.querySelectorAll<HTMLTableRowElement>('tr'),
					);
					rows.sort((a, b) => {
						const ra = a.dataset['col' + i] ?? '';
						const rb = b.dataset['col' + i] ?? '';
						const na = Number(ra);
						const nb = Number(rb);
						const aN = ra !== '' && !Number.isNaN(na);
						const bN = rb !== '' && !Number.isNaN(nb);
						let cmp: number;
						if (aN && bN) cmp = na - nb;
						else cmp = ra.localeCompare(rb, 'es', { numeric: true });
						return asc ? cmp : -cmp;
					});
					rows.forEach((row, pos) => {
						body.appendChild(row);
						const posEl = row.querySelector('[data-pos]');
						if (posEl) (posEl as HTMLElement).textContent = String(pos + 1);
					});
					headers.forEach((h) => {
						h.dataset.dir = '';
						h.classList.remove('sorted-asc', 'sorted-desc');
					});
					th.dataset.dir = asc ? 'asc' : 'desc';
					th.classList.add(asc ? 'sorted-asc' : 'sorted-desc');
				});
			});
		});

	// Filtro en vivo: input[data-filter-for] filtra filas de una tabla
	document
		.querySelectorAll<HTMLInputElement>('input[data-filter-for]')
		.forEach((input) => {
			input.addEventListener('input', () => {
				const table = document.querySelector<HTMLTableElement>(
					input.dataset.filterFor ?? '',
				);
				if (!table) return;
				const q = input.value.trim().toLowerCase();
				table
					.querySelectorAll<HTMLTableRowElement>('tbody tr')
					.forEach((row) => {
						row.hidden = !(row.dataset.search ?? '')
							.toLowerCase()
							.includes(q);
					});
			});
		});

	staggerRows();
});