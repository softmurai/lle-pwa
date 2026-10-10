import { env } from 'cloudflare:workers';

export const prerender = false;

export const GET = async ({ params }: { params: Record<string, string | undefined> }) => {
	const file = params.file;

	if (!file || !/^[a-z0-9-]+\.svg$/.test(file)) {
		return new Response('Not Found', { status: 404 });
	}

	const object = await env.MEDIA.get(`logos/${file}`);
	if (object === null) {
		return new Response('Not Found', { status: 404 });
	}

	return new Response(object.body, {
		headers: {
			'Content-Type': 'image/svg+xml',
			'Cache-Control': 'public, max-age=86400',
			'X-Content-Type-Options': 'nosniff',
			'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
			'Content-Length': String(object.size),
		},
	});
};