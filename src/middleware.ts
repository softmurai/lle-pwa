import { defineMiddleware } from 'astro:middleware';
import { SESSION_COOKIE, verifySession } from './lib/auth';

// Login page and login endpoint are reachable without a session.
const PUBLIC = new Set(['/admin', '/admin/login', '/api/admin/login']);

// Registered as 'referee' (arbis): actas only.
const REFEREE_BLOCKED_PREFIXES = ['/admin/jornadas'];
const REFEREE_BLOCKED_APIS = ['/schedule', '/postpone'];

function isProtected(pathname: string): boolean {
	return pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/');
}

export const onRequest = defineMiddleware(async (context, next) => {
	const { pathname } = context.url;

	if (!isProtected(pathname) || PUBLIC.has(pathname)) {
		return next();
	}

	const token = context.cookies.get(SESSION_COOKIE)?.value;
	const session = await verifySession(token);

	if (!session.valid) {
		if (pathname.startsWith('/api/')) {
			return new Response(JSON.stringify({ error: 'No autorizado' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
			});
		}
		const next = encodeURIComponent(pathname + context.url.search);
		return context.redirect(`/admin?next=${next}`);
	}

	context.locals.admin = session.user;

	if (session.user?.role === 'referee') {
		const blockedPage = REFEREE_BLOCKED_PREFIXES.some((p) => pathname.startsWith(p));
		const blockedApi = REFEREE_BLOCKED_APIS.some((s) => pathname.endsWith(s));
		if (blockedPage || blockedApi) {
			if (pathname.startsWith('/api/')) {
				return new Response(JSON.stringify({ error: 'Acceso denegado' }), {
					status: 403,
					headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
				});
			}
			return context.redirect('/admin/dashboard');
		}
	}

	return next();
});
