/**
 * Custom pull-to-refresh for the installed mobile PWA.
 *
 * Only runs in standalone display mode (or with a `?ptr=1` dev override), on
 * touch devices, and only when the page is scrolled to the top. The page
 * content stays still: a brand-colored basketball emerges from under the
 * bottom edge of the header and travels down to a third of the viewport
 * height as you pull. Releasing past the threshold reloads the page.
 */

const THRESHOLD = 70;
const MAX_PULL = 110;
const RESISTANCE = 0.5;
const INDICATOR_SIZE = 28;

const standalone =
	window.matchMedia('(display-mode: standalone)').matches ||
	(window.navigator as Navigator & { standalone?: boolean }).standalone === true;
const override = new URLSearchParams(window.location.search).has('ptr');
const touch = window.matchMedia('(hover: none)').matches || 'ontouchstart' in window;

if ((standalone || override) && touch) init();

function init() {
	const indicator = document.getElementById('ptr-indicator');
	if (!indicator) return;

	// Suppress the native pull-to-refresh while ours is active.
	document.documentElement.classList.add('pwa-standalone');

	let startX = 0;
	let startY = 0;
	let pulled = 0;
	let dragging = false;
	let refreshing = false;

	const setProgress = (p: number) => indicator.style.setProperty('--ptr-progress', String(p));

	const scrollTop = () => window.scrollY || document.documentElement.scrollTop || 0;

	// Anchors the spinner between the header's bottom edge and one third of the
	// viewport height.
	const measure = () => {
		const header = document.querySelector('header');
		const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
		const travel = Math.max(
			0,
			window.innerHeight / 3 - headerBottom + INDICATOR_SIZE / 2
		);
		indicator.style.setProperty('--ptr-top', `${headerBottom}px`);
		indicator.style.setProperty('--ptr-travel', `${travel}px`);
	};

	// Ignore gestures that begin inside an element with its own scroll area
	// (e.g. the calendario day strip).
	const startsInScroller = (target: EventTarget | null) => {
		let el = target as HTMLElement | null;
		while (el && el !== document.body) {
			const style = getComputedStyle(el);
			const scrollsY =
				(style.overflowY === 'auto' || style.overflowY === 'scroll') &&
				el.scrollHeight > el.clientHeight;
			const scrollsX =
				(style.overflowX === 'auto' || style.overflowX === 'scroll') &&
				el.scrollWidth > el.clientWidth;
			if (scrollsY || scrollsX) return true;
			el = el.parentElement;
		}
		return false;
	};

	const onStart = (event: TouchEvent) => {
		if (refreshing || event.touches.length !== 1) return;
		if (scrollTop() > 0 || startsInScroller(event.target)) return;
		const point = event.touches[0];
		startX = point.clientX;
		startY = point.clientY;
		pulled = 0;
		dragging = true;
		measure();
		indicator.classList.add('ptr-dragging');
	};

	const onMove = (event: TouchEvent) => {
		if (!dragging || refreshing) return;
		const point = event.touches[0];
		const dy = point.clientY - startY;
		const dx = point.clientX - startX;

		if (Math.abs(dx) > Math.abs(dy)) {
			dragging = false;
			settle();
			return;
		}
		if (dy <= 0) {
			if (pulled > 0) settle();
			return;
		}

		event.preventDefault();
		pulled = Math.min(dy * RESISTANCE, MAX_PULL);
		setProgress(Math.min(pulled / THRESHOLD, 1));
	};

	const onEnd = () => {
		if (!dragging) return;
		dragging = false;

		if (pulled >= THRESHOLD) {
			refreshing = true;
			indicator.classList.remove('ptr-dragging');
			setProgress(1);
			indicator.classList.add('refreshing');
			window.setTimeout(() => window.location.reload(), 300);
			return;
		}
		settle();
	};

	// Slide the spinner back up under the header.
	const settle = () => {
		dragging = false;
		pulled = 0;
		indicator.classList.remove('ptr-dragging');
		setProgress(0);
	};

	document.addEventListener('touchstart', onStart, { passive: true });
	document.addEventListener('touchmove', onMove, { passive: false });
	document.addEventListener('touchend', onEnd);
	document.addEventListener('touchcancel', onEnd);
	window.addEventListener('resize', measure);
	window.addEventListener('orientationchange', measure);
}
