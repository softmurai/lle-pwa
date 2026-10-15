import type { APIRoute } from 'astro';
import { destroySession, SESSION_COOKIE } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
	const token = cookies.get(SESSION_COOKIE)?.value;
	await destroySession(token);
	cookies.delete(SESSION_COOKIE, { path: '/' });
	return new Response(null, {
		status: 303,
		headers: { Location: '/admin', 'Cache-Control': 'no-store' },
	});
};
