/**
 * Header tooltips for table acronyms.
 *
 * The popup is a single element appended to <body> and positioned with fixed
 * coordinates, so it is never clipped by a table's `overflow-x-auto` wrapper
 * and always stacks above the page. Behaviour:
 *
 * - opens above the header (below it only if there is no room);
 * - hover, keyboard focus and touch all use the same placement;
 * - only one tooltip is open at a time, and any other tap closes it.
 */

const TIP_ID = 'th-tooltip';

let tip: HTMLDivElement | null = null;
let openTrigger: HTMLElement | null = null;

type Placement = 'above' | 'below';

function ensureTip(): HTMLDivElement {
	if (tip) return tip;
	const el = document.createElement('div');
	el.id = TIP_ID;
	el.className = 'th-tip';
	el.setAttribute('role', 'tooltip');
	el.dataset.visible = 'false';
	document.body.appendChild(el);
	tip = el;
	return el;
}

function hide(): void {
	if (!tip) return;
	tip.dataset.visible = 'false';
	openTrigger = null;
}

function show(trigger: HTMLElement, text: string): void {
	if (!text) return;

	const el = ensureTip();
	const margin = 8;
	el.textContent = text;
	el.dataset.visible = 'false';
	el.style.left = '0px';
	el.style.top = '0px';

	const rect = trigger.getBoundingClientRect();
	const width = el.offsetWidth;
	const height = el.offsetHeight;

	// Default to above the header; flip below only when there is no room.
	const fitsAbove = rect.top - height - margin >= margin;
	const fitsBelow = rect.bottom + height + margin <= window.innerHeight - margin;
	const placement: Placement = !fitsAbove && fitsBelow ? 'below' : 'above';

	const center = rect.left + rect.width / 2;
	const halfWidth = width / 2;
	const left = Math.min(
		Math.max(center, margin + halfWidth),
		window.innerWidth - margin - halfWidth,
	);
	const top =
		placement === 'above' ? rect.top - height - margin : rect.bottom + margin;

	el.dataset.placement = placement;
	el.style.left = `${left}px`;
	el.style.top = `${top}px`;
	const arrowX = Math.min(Math.max(center - (left - halfWidth), margin), width - margin);
	el.style.setProperty('--tip-arrow-x', `${arrowX}px`);
	el.dataset.visible = 'true';
	openTrigger = trigger;
}

function holderFor(th: HTMLElement): HTMLElement | null {
	return th.querySelector<HTMLElement>('[data-tip]');
}

function triggerOf(holder: HTMLElement): HTMLElement {
	return holder.closest<HTMLElement>('th') ?? holder;
}

function init(): void {
	document.querySelectorAll<HTMLElement>('[data-tip]').forEach((holder) => {
		const trigger = triggerOf(holder);
		const text = holder.dataset.tip ?? '';
		if (!text) return;

		trigger.addEventListener('pointerenter', (event) => {
			if (event.pointerType !== 'mouse') return;
			show(trigger, text);
		});
		trigger.addEventListener('pointerleave', (event) => {
			if (event.pointerType !== 'mouse') return;
			if (openTrigger === trigger) hide();
		});

		holder.addEventListener('focus', () => {
			show(trigger, text);
		});
		holder.addEventListener('blur', () => {
			if (openTrigger === trigger) hide();
		});
		holder.addEventListener('keydown', (event) => {
			if (event.key !== 'Escape') return;
			hide();
			holder.blur();
		});
	});
}

// Any touch closes the previous tip; a tap on another header reopens it.
// Mouse keeps the hover/focus behaviour untouched: a click on a header should
// not make its tooltip disappear while the pointer is still there.
document.addEventListener(
	'pointerdown',
	(event) => {
		if ((event.pointerType || 'mouse') === 'mouse') return;

		hide();

		const target = event.target as Element | null;
		const th = target?.closest<HTMLElement>('th');
		if (!th) return;
		const holder = holderFor(th);
		if (!holder) return;
		show(th, holder.dataset.tip ?? '');
	},
	true,
);

document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape') hide();
});
window.addEventListener('scroll', hide, true);
window.addEventListener('resize', hide);

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}

// Keep this file a module: pull-to-refresh.ts declares its own top-level `init`.
export {};
