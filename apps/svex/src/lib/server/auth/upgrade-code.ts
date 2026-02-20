/**
 * Server-only: one-time upgrade codes. Trusted/admin can create codes that upgrade a user to their level or lower.
 * Stored in upgrade_tokens table.
 */
import { getDb } from "../storage/db.js";

const CODE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export interface UpgradeCodePayload {
	targetUserKind: "trusted" | "admin";
	expiresAt: number;
}

export function createUpgradeCode(targetUserKind: "trusted" | "admin"): {
	code: string;
	expiresAt: number;
} {
	const code = crypto.randomUUID();
	const expiresAt = Date.now() + CODE_TTL_MS;
	getDb()
		.prepare("INSERT INTO upgrade_tokens (token, target_user_kind, expires_at) VALUES (?, ?, ?)")
		.run(code, targetUserKind, expiresAt);
	return { code, expiresAt };
}

/** Return existing unexpired admin code, or null. */
function getExistingAdminCode(): string | null {
	const db = getDb();
	const now = Date.now();
	const row = db
		.prepare(
			"SELECT token FROM upgrade_tokens WHERE target_user_kind = 'admin' AND expires_at > ? ORDER BY expires_at DESC LIMIT 1",
		)
		.get(now) as { token: string } | undefined;
	return row?.token ?? null;
}

/** If no admins and no admin upgrade codes: create or get one and log the URL. Call at startup. */
export function ensureAdminUpgradeCodeAndLog(origin: string): void {
	const db = getDb();
	const adminSession = db.prepare("SELECT 1 FROM sessions WHERE user_kind = 'admin' LIMIT 1").get();
	if (adminSession) return;
	const existing = getExistingAdminCode();
	const code = existing ?? createUpgradeCode("admin").code;
	const url = `${origin}/upgrade/${code}`;
	const msg =
		"\n\n" +
		"═══════════════════════════════════════════════════════════════\n" +
		"  [svex] No admins yet. Use this link to become admin:\n" +
		"  " +
		url +
		"\n" +
		"═══════════════════════════════════════════════════════════════\n\n";
	process.stderr.write(msg);
}

/** Consume code: return payload if valid and not expired; delete. One-time use. */
export function consumeUpgradeCode(code: string): UpgradeCodePayload | null {
	if (!/^[a-zA-Z0-9-]+$/.test(code) || code.length > 64) return null;
	const db = getDb();
	const row = db.prepare("SELECT target_user_kind, expires_at FROM upgrade_tokens WHERE token = ?").get(code) as {
		target_user_kind: string;
		expires_at: number;
	} | undefined;
	if (!row) return null;
	db.prepare("DELETE FROM upgrade_tokens WHERE token = ?").run(code);
	if (row.expires_at < Date.now()) return null;
	if (row.target_user_kind !== "trusted" && row.target_user_kind !== "admin") return null;
	return {
		targetUserKind: row.target_user_kind as "trusted" | "admin",
		expiresAt: row.expires_at,
	};
}
