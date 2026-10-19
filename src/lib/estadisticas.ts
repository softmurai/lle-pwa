type StatKey = 'points' | 'three' | 'fg' | 'ft' | 'fouls';
type SortDir = 'desc' | 'asc' | '';

const INITIAL_LIMIT = 10;
const STEP = 10;

// Each tab maps to the column its leaderboard is ranked by default.
const STAT_COL: Record<StatKey, string> = {
	points: 'points',
	three: 'three',
	fg: 'fg',
	ft: 'ft',
	fouls: 'fouls',
};

document.addEventListener('DOMContentLoaded', () => {
	const table = document.querySelector<HTMLTableElement>('#players-table');
	const tbody = table?.querySelector<HTMLTableSectionElement>('tbody');
	if (!table || !tbody) return;

	const rows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>('tr'));
	if (rows.length === 0) return;

	const headers = Array.from(
		table.querySelectorAll<HTMLTableCellElement>('thead th[data-sort]'),
	);
	const statCells = Array.from(table.querySelectorAll<HTMLElement>('[data-stat-col]'));
	const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-stat-tab]'));
	const teamToggle = document.querySelector<HTMLButtonElement>('[data-team-toggle]');
	const teamMenu = document.querySelector<HTMLElement>('[data-team-menu]');
	const teamLabel = document.querySelector<HTMLElement>('[data-team-label]');
	const teamOptions = Array.from(
		document.querySelectorAll<HTMLElement>('[data-team-value]'),
	);
	const showMoreBtn = document.querySelector<HTMLButtonElement>('[data-show-more]');

	let activeStat: StatKey = 'points';
	let sortCol = STAT_COL[activeStat];
	let sortDir: 'desc' | 'asc' = 'desc';
	let activeHeader: HTMLTableCellElement | null = null;
	let teamFilter = '';
	let visibleCount = INITIAL_LIMIT;

	const readValue = (row: HTMLTableRowElement, col: string) =>
		row.dataset['col' + col] ?? '';

	const compareCol = (a: HTMLTableRowElement, b: HTMLTableRowElement, col: string) => {
		const ra = readValue(a, col);
		const rb = readValue(b, col);
		const na = Number(ra);
		const nb = Number(rb);
		const aNumeric = ra !== '' && !Number.isNaN(na);
		const bNumeric = rb !== '' && !Number.isNaN(nb);
		if (aNumeric && bNumeric) return na - nb;
		return ra.localeCompare(rb, 'es', { numeric: true });
	};

	const compareRows = (a: HTMLTableRowElement, b: HTMLTableRowElement) => {
		const primary = compareCol(a, b, sortCol) * (sortDir === 'asc' ? 1 : -1);
		if (primary !== 0) return primary;

		// Tiebreak: most games played first.
		const pj = (Number(b.dataset.pj) || 0) - (Number(a.dataset.pj) || 0);
		if (pj !== 0) return pj;

		// Then alphabetical.
		return readValue(a, 'name').localeCompare(readValue(b, 'name'), 'es', {
			numeric: true,
		});
	};

	const render = () => {
		const sorted = [...rows].sort(compareRows);
		sorted.forEach((row) => tbody.appendChild(row));

		const filtered = sorted.filter(
			(row) => !teamFilter || row.dataset.teamId === teamFilter,
		);
		const total = filtered.length;
		const filteredSet = new Set(filtered);

		for (const row of rows) {
			if (!filteredSet.has(row)) row.classList.add('hidden');
		}

		filtered.forEach((row, i) => {
			// POS always follows the leaderboard: rank 1 is the leader at the
			// "most first" end. When the current sort is ascending, the first
			// visible row is the last-ranked player, so the numbers count down.
			const position = sortDir === 'asc' ? total - i : i + 1;
			const posCell = row.querySelector<HTMLElement>('[data-pos]');
			if (posCell) posCell.textContent = String(position);
			row.classList.toggle('hidden', i >= visibleCount);
		});

		showMoreBtn?.classList.toggle('hidden', total <= visibleCount);
	};

	const clearHeaderState = () => {
		headers.forEach((header) => {
			header.classList.remove('sorted-asc', 'sorted-desc');
			delete header.dataset.dir;
		});
	};

	const setHeaderState = (header: HTMLTableCellElement, state: SortDir) => {
		clearHeaderState();
		if (!state) return;
		header.dataset.dir = state;
		header.classList.add(state === 'asc' ? 'sorted-asc' : 'sorted-desc');
	};

	const applyStatColumns = (stat: StatKey) => {
		statCells.forEach((cell) => {
			cell.classList.toggle('hidden', cell.dataset.statCol !== stat);
		});
	};

	const selectTab = (stat: StatKey) => {
		activeStat = stat;
		tabs.forEach((tab) => {
			const active = tab.dataset.statTab === stat;
			if (active) tab.setAttribute('data-active', '');
			else tab.removeAttribute('data-active');
			tab.setAttribute('aria-pressed', active ? 'true' : 'false');
		});

		applyStatColumns(stat);
		sortCol = STAT_COL[stat];
		sortDir = 'desc';
		activeHeader = null;
		clearHeaderState();
		visibleCount = INITIAL_LIMIT;
		render();
	};

	headers.forEach((header) => {
		header.addEventListener('click', () => {
			const col = header.dataset.col;
			if (!col) return;

			if (activeHeader !== header) {
				activeHeader = header;
				sortCol = col;
				sortDir = 'desc';
				setHeaderState(header, 'desc');
			} else if (sortDir === 'desc') {
				sortDir = 'asc';
				setHeaderState(header, 'asc');
			} else {
				// Third click: restore the current tab's default ranking.
				activeHeader = null;
				sortCol = STAT_COL[activeStat];
				sortDir = 'desc';
				clearHeaderState();
			}
			render();
		});
	});

	tabs.forEach((tab) => {
		tab.addEventListener('click', () => {
			const stat = tab.dataset.statTab as StatKey | undefined;
			if (stat) selectTab(stat);
		});
	});

	// EQUIPO pill dropdown.
	if (teamToggle && teamMenu) {
		// Move the menu out of the overflow-x-auto pill row (otherwise it is
		// clipped on mobile) and anchor it to the toggle with fixed coords.
		document.body.appendChild(teamMenu);

		let menuOpen = false;
		let closeTimer: number | undefined;

		const positionMenu = () => {
			const rect = teamToggle.getBoundingClientRect();
			const margin = 8;
			const menuWidth = teamMenu.offsetWidth;
			const left = Math.min(
				Math.max(margin, rect.left),
				window.innerWidth - menuWidth - margin,
			);
			teamMenu.style.left = `${left}px`;
			teamMenu.style.top = `${rect.bottom + 6}px`;
		};

		const openMenu = () => {
			menuOpen = true;
			window.clearTimeout(closeTimer);
			teamMenu.hidden = false;
			positionMenu();
			// Paint the closed state before transitioning to open.
			void teamMenu.offsetWidth;
			teamMenu.dataset.open = '';
			teamToggle.dataset.open = '';
			teamToggle.setAttribute('aria-expanded', 'true');

			const selected =
				teamOptions.find((option) => option.getAttribute('aria-selected') === 'true') ??
				teamOptions[0];
			selected?.focus();
		};

		const closeMenu = (restoreFocus = false) => {
			if (!menuOpen) return;
			menuOpen = false;
			delete teamMenu.dataset.open;
			delete teamToggle.dataset.open;
			teamToggle.setAttribute('aria-expanded', 'false');
			window.clearTimeout(closeTimer);
			closeTimer = window.setTimeout(() => {
				if (!menuOpen) teamMenu.hidden = true;
			}, 100);
			if (restoreFocus) teamToggle.focus();
		};

		const selectTeam = (option: HTMLElement) => {
			const value = option.dataset.teamValue ?? '';
			teamFilter = value;

			if (teamLabel) teamLabel.textContent = option.textContent?.trim() ?? 'Liga';
			if (value) teamToggle.dataset.active = '';
			else delete teamToggle.dataset.active;

			teamOptions.forEach((item) => {
				item.setAttribute('aria-selected', item === option ? 'true' : 'false');
			});

			closeMenu();
			visibleCount = INITIAL_LIMIT;
			render();
		};

		teamToggle.addEventListener('click', () => {
			if (menuOpen) closeMenu();
			else openMenu();
		});

		teamOptions.forEach((option) => {
			option.addEventListener('click', () => selectTeam(option));
		});

		teamMenu.addEventListener('keydown', (event) => {
			const index = teamOptions.indexOf(document.activeElement as HTMLElement);
			if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
				event.preventDefault();
				const delta = event.key === 'ArrowDown' ? 1 : -1;
				const next = (index + delta + teamOptions.length) % teamOptions.length;
				teamOptions[next]?.focus();
			} else if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				if (index >= 0) selectTeam(teamOptions[index]);
			} else if (event.key === 'Escape') {
				event.preventDefault();
				closeMenu(true);
			}
		});

		document.addEventListener('pointerdown', (event) => {
			if (!menuOpen) return;
			const target = event.target as Node;
			if (teamMenu.contains(target) || teamToggle.contains(target)) return;
			closeMenu();
		});

		window.addEventListener('scroll', () => closeMenu(), true);
		window.addEventListener('resize', () => {
			if (menuOpen) positionMenu();
		});
	}

	showMoreBtn?.addEventListener('click', () => {
		visibleCount += STEP;
		render();
	});

	selectTab('points');
});
