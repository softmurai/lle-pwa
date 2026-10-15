import { env } from 'cloudflare:workers';

export type Role = 'admin' | 'referee';

export interface AdminUser {
	username: string;
	role: Role;
}

interface UserRecord {
	role: Role;
	salt: string;
	hash: string;
	iterations: number;
}

type UsersConfig = Record<string, UserRecord>;

/** Session lifetime: idle timeout and absolute cap (seconds). */
const SESSION_IDLE = 60 * 60; // 1 hour of inactivity
const SESSION_MAX = 8 * 60 * 60; // hard cap, 8 hours

const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000; // 15 minutes

export const SESSION_COOKIE = 'lle_admin';

function users(): UsersConfig {
	const raw = (env as unknown as { ADMIN_USERS?: string }).ADMIN_USERS;
	if (!raw) return {};
	try {
		return JSON.parse(raw) as UsersConfig;
	} catch {
		return {};
	}
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
	const out = new Uint8Array(new ArrayBuffer(hex.length / 2));
	for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	return out;
}

function toBase64(buf: ArrayBuffer): string {
	const bytes = new Uint8Array(buf);
	let bin = '';
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin);
}

function toHex(buf: ArrayBuffer): string {
	const bytes = new Uint8Array(buf);
	return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomToken(): string {
	return toHex(crypto.getRandomValues(new Uint8Array(32)).buffer);
}

export function randomSalt(): string {
	return toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

export async function deriveHash(
	password: string,
	saltHex: string,
	iterations: number,
): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(password),
		'PBKDF2',
		false,
		['deriveBits'],
	);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt: fromHex(saltHex), iterations, hash: 'SHA-256' },
		key,
		256,
	);
	return toBase64(bits);
}

/** Length-independent, constant-time string comparison. */
function safeEqual(a: string, b: string): boolean {
	const ab = new TextEncoder().encode(a);
	const bb = new TextEncoder().encode(b);
	let diff = ab.length ^ bb.length;
	const len = Math.max(ab.length, bb.length);
	for (let i = 0; i < len; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
	return diff === 0;
}

async function throttleStatus(
	username: string,
): Promise<{ locked: boolean; failures: number }> {
	const row = (await env.lle_pwa
		.prepare('SELECT failures, locked_until FROM login_attempts WHERE username = ?')
		.bind(username)
		.first()) as { failures: number; locked_until: number | null } | null;
	if (!row) return { locked: false, failures: 0 };
	const now = Date.now();
	if (row.locked_until && row.locked_until > now) return { locked: true, failures: row.failures };
	return { locked: false, failures: row.failures };
}

async function recordFailure(username: string): Promise<void> {
	const now = Date.now();
	const row = (await env.lle_pwa
		.prepare('SELECT failures FROM login_attempts WHERE username = ?')
		.bind(username)
		.first()) as { failures: number } | null;
	const failures = (row?.failures ?? 0) + 1;
	const lockedUntil = failures >= MAX_FAILURES ? now + LOCK_MS : null;
	await env.lle_pwa
		.prepare(
			`INSERT INTO login_attempts (username, failures, locked_until) VALUES (?, ?, ?)
			 ON CONFLICT(username) DO UPDATE SET failures = excluded.failures, locked_until = excluded.locked_until`,
		)
		.bind(username, failures, lockedUntil)
		.run();
}

async function clearFailures(username: string): Promise<void> {
	await env.lle_pwa.prepare('DELETE FROM login_attempts WHERE username = ?').bind(username).run();
}

export type LoginResult =
	| { ok: true; user: AdminUser; token: string }
	| { ok: false; reason: 'invalid' | 'locked' };

export async function login(username: string, password: string): Promise<LoginResult> {
	const name = username.trim().toLowerCase();
	const config = users();
	const record = config[name];

	const status = await throttleStatus(name);
	if (status.locked) return { ok: false, reason: 'locked' };

	if (!record) {
		// Still burn a hash to avoid user-enumeration timing differences.
		await deriveHash(password, '00'.repeat(16), 100_000);
		await recordFailure(name);
		return { ok: false, reason: 'invalid' };
	}

	const candidate = await deriveHash(password, record.salt, record.iterations);
	if (!safeEqual(candidate, record.hash)) {
		await recordFailure(name);
		return { ok: false, reason: 'invalid' };
	}

	await clearFailures(name);
	const token = await createSession(name);
	return { ok: true, user: { username: name, role: record.role }, token };
}

export async function createSession(username: string): Promise<string> {
	const token = randomToken();
	const now = Math.floor(Date.now() / 1000);
	await env.lle_pwa
		.prepare(
			`INSERT INTO admin_sessions (token, username, created_at, last_seen_at, expires_at)
			 VALUES (?, ?, ?, ?, ?)`,
		)
		.bind(token, username, now, now, now + SESSION_IDLE)
		.run();
	return token;
}

export interface SessionInfo {
	valid: boolean;
	user?: AdminUser;
}

/** Validates a session, sliding the idle window forward (bounded by the absolute cap). */
export async function verifySession(token: string | undefined): Promise<SessionInfo> {
	if (!token) return { valid: false };
	const now = Math.floor(Date.now() / 1000);

	const row = (await env.lle_pwa
		.prepare(
			'SELECT username, created_at, expires_at FROM admin_sessions WHERE token = ?',
		)
		.bind(token)
		.first()) as { username: string; created_at: number; expires_at: number } | null;

	if (!row) return { valid: false };
	if (now >= row.expires_at) return { valid: false };
	if (now >= row.created_at + SESSION_MAX) return { valid: false };

	const record = users()[row.username];
	if (!record) return { valid: false };

	const newExpiry = Math.min(now + SESSION_IDLE, row.created_at + SESSION_MAX);
	await env.lle_pwa
		.prepare('UPDATE admin_sessions SET last_seen_at = ?, expires_at = ? WHERE token = ?')
		.bind(now, newExpiry, token)
		.run();

	return { valid: true, user: { username: row.username, role: record.role } };
}

export async function destroySession(token: string | undefined): Promise<void> {
	if (!token) return;
	await env.lle_pwa.prepare('DELETE FROM admin_sessions WHERE token = ?').bind(token).run();
}

export async function cleanupSessions(): Promise<void> {
	const now = Math.floor(Date.now() / 1000);
	await env.lle_pwa.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').bind(now).run();
}
