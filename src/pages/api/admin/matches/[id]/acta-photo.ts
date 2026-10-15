import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';

export const prerender = false;

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

function extFromMime(mime: string): string | null {
	if (mime === 'image/svg+xml') return 'svg';
	if (mime === 'image/png') return 'png';
	if (mime === 'image/webp') return 'webp';
	if (mime === 'image/jpeg') return 'jpg';
	return null;
}

export const POST: APIRoute = async ({ params, request }) => {
	const matchId = Number.parseInt(params.id ?? '', 10);
	if (!Number.isInteger(matchId)) {
		return new Response(JSON.stringify({ error: 'ID inválido' }), { status: 400 });
	}

	const form = await request.formData();
	const file = form.get('photo') as File | null;
	if (!file) {
		return new Response(JSON.stringify({ error: 'Falta la imagen' }), { status: 400 });
	}

	if (!ALLOWED.includes(file.type)) {
		return new Response(JSON.stringify({ error: 'Formato no soportado (jpg/png/webp/svg)' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
		});
	}

	if (file.size > 4 * 1024 * 1024) {
		return new Response(JSON.stringify({ error: 'La imagen supera los 4MB' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
		});
	}

	const ext = extFromMime(file.type);
	if (!ext) {
		return new Response(JSON.stringify({ error: 'Formato no soportado' }), { status: 400 });
	}

	const ts = Date.now();
	const key = `actas/${matchId}-${ts}.${ext}`;

	await env.MEDIA.put(key, file, {
		httpMetadata: {
			contentType: file.type,
			cacheControl: 'public, max-age=31536000, immutable',
		},
	});

	return new Response(JSON.stringify({ key }), {
		status: 200,
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
	});
};
