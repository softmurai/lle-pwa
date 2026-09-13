const VERSION = 'lle-v1';
const ASSET_CACHE = `assets-${VERSION}`;
const PAGE_CACHE = `pages-${VERSION}`;
const CORE_ASSETS = [
	'/',
	'/offline',
	'/manifest.webmanifest',
	'/icons/icon-192.png',
	'/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(PAGE_CACHE)
			.then((cache) => cache.addAll(CORE_ASSETS))
			.then(() => self.skipWaiting()),
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => !key.includes(VERSION))
						.map((key) => caches.delete(key)),
				),
			)
			.then(() => self.clients.claim()),
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== self.origin) return;
	if (url.pathname === '/sw.js') return;

	// Navegación: red primero, caemos a caché o a la página de inicio/offline
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => {
					if (response.ok) {
						const copy = response.clone();
						caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy));
					}
					return response;
				})
				.catch(() =>
					caches.match(request).then((cached) =>
						cached ||
						caches.match('/').then((home) =>
							home || caches.match('/offline'),
						),
					),
				),
		);
		return;
	}

	// Estáticos: caché primero, actualizamos en segundo plano
	event.respondWith(
		caches.match(request).then((cached) => {
			const network = fetch(request)
				.then((response) => {
					if (response.ok) {
						const copy = response.clone();
						caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
					}
					return response;
				})
				.catch(() => cached);
			return cached || network;
		}),
	);
});