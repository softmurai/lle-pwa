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
	// Orden de tablas: clic en una columna con [data-sort].
	// Ciclo de tres estados: 1) más primero (desc, ↑) 2) menos primero (asc, ↓)
	// 3) vuelta al orden original de la tabla (dorsal / clasificación), sin icono.
	document
		.querySelectorAll<HTMLTableElement>('table[data-sortable]')
		.forEach((table) => {
			const body = table.querySelector('tbody');
			if (!body) return;
			const headers = Array.from(
				table.querySelectorAll<HTMLTableCellElement>('thead th[data-sort]'),
			);

			// Orden con el que se renderizó la tabla en el servidor, para poder
			// restaurarlo en el tercer clic (y las posiciones, si las hay).
			const originalRows = Array.from(body.querySelectorAll<HTMLTableRowElement>('tr'));
			const originalPositions = originalRows.map((row) => {
				const el = row.querySelector<HTMLElement>('[data-pos]');
				return el ? el.textContent : null;
			});

			const setState = (th: HTMLTableCellElement, state: '' | 'asc' | 'desc') => {
				headers.forEach((h) => {
					delete h.dataset.dir;
					h.classList.remove('sorted-asc', 'sorted-desc');
				});
				if (!state) return;
				th.dataset.dir = state;
				th.classList.add(state === 'asc' ? 'sorted-asc' : 'sorted-desc');
			};

			const renumber = () => {
				Array.from(body.querySelectorAll<HTMLTableRowElement>('tr')).forEach((row, i) => {
					const pos = row.querySelector('[data-pos]');
					if (pos) pos.textContent = String(i + 1);
				});
			};

			const restore = () => {
				originalRows.forEach((row, i) => {
					body.appendChild(row);
					const pos = row.querySelector('[data-pos]');
					if (pos) pos.textContent = originalPositions[i] ?? String(i + 1);
				});
			};

			headers.forEach((th, headerIndex) => {
				th.addEventListener('click', () => {
					const state = th.dataset.dir;
					const next: '' | 'asc' | 'desc' =
						state === 'desc' ? 'asc' : state === 'asc' ? '' : 'desc';

					if (!next) {
						restore();
						setState(th, '');
						return;
					}

					// Explicit data-col wins so a table can expose only some columns
					// (e.g. the box score keeps "Jugador" unsorted).
					const col = th.dataset.col ?? String(headerIndex);
					const rows = Array.from(body.querySelectorAll<HTMLTableRowElement>('tr'));
					const direction = next === 'asc' ? 1 : -1;

					rows.sort((a, b) => {
						const ra = a.dataset['col' + col] ?? '';
						const rb = b.dataset['col' + col] ?? '';
						const na = Number(ra);
						const nb = Number(rb);
						const aN = ra !== '' && !Number.isNaN(na);
						const bN = rb !== '' && !Number.isNaN(nb);
						const cmp =
							aN && bN ? na - nb : ra.localeCompare(rb, 'es', { numeric: true });
						return direction * cmp;
					});
					rows.forEach((row) => body.appendChild(row));
					renumber();
					setState(th, next);
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
