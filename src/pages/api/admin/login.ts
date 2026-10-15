import type { APIRoute } from 'astro';
import { login, SESSION_COOKIE } from '../../../lib/auth';

export const prerender = false;

const SESSION_MAX_AGE = 8 * 60 * 60; // matches auth.ts SESSION_MAX

function safeNext(value: string | null): string {
	if (!value) return '/admin/dashboard';
	// Only allow same-site admin paths.
	if (value.startsWith('/admin/') && !value.startsWith('//')) return value;
	return '/admin/dashboard';
}

export const POST: APIRoute = async ({ request, cookies, url }) => {
	const form = await request.formData();
	const username = String(form.get('username') ?? '');
	const password = String(form.get('password') ?? '');
	const next = safeNext(form.get('next')?.toString() ?? null);

	const secure = url.protocol === 'https:';

	if (!username || !password) {
		return contextRedirect('/admin?error=missing');
	}

	const result = await login(username, password);

	if (!result.ok) {
		const reason = result.reason === 'locked' ? 'locked' : 'invalid';
		const target = `/admin?error=${reason}&next=${encodeURIComponent(next)}`;
		return contextRedirect(target);
	}

	cookies.set(SESSION_COOKIE, result.token, {
		path: '/',
		httpOnly: true,
		sameSite: 'strict',
		secure,
		maxAge: SESSION_MAX_AGE,
	});

	return contextRedirect(next);

	function contextRedirect(location: string): Response {
		return new Response(null, {
			status: 303,
			headers: { Location: location, 'Cache-Control': 'no-store' },
		});
	}
};
