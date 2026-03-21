/**
 * Server-only: one-time upgrade codes. Stored hashed (HMAC-SHA256 + pepper); raw shown once.
 * First admin: use `npm run svex:bootstrap-admin` to get a short-TTL link (no app log leakage).
 */
import { getDb } from "../storage/db.js";
import { hashToken } from "./token-utils.js";

const CODE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export interface UpgradeCodePayload {
	targetUserKind: "trusted" | "admin";
	expiresAt: number;
}

export function createUpgradeCode(targetUserKind: "trusted" | "admin"): {
	code: string;
	expiresAt: number;
} {
	return createUpgradeCodeWithTtl(targetUserKind, CODE_TTL_MS);
}

/** Short-TTL admin code for bootstrap link (e.g. 10 min). */
export function createBootstrapAdminCode(ttlMs: number): { code: string; expiresAt: number } {
	return createUpgradeCodeWithTtl("admin", ttlMs);
}

function createUpgradeCodeWithTtl(
	targetUserKind: "trusted" | "admin",
	ttlMs: number,
): { code: string; expiresAt: number } {
	const rawCode = crypto.randomUUID();
	const stored = hashToken(rawCode);
	const expiresAt = Date.now() + ttlMs;
	const now = Date.now();
	getDb()
		.prepare(
			"INSERT INTO upgrade_tokens (token, target_user_kind, expires_at, created_at) VALUES (?, ?, ?, ?)",
		)
		.run(stored, targetUserKind, expiresAt, now);
	return { code: rawCode, expiresAt };
}

/** Consume code: return payload if valid and not expired; delete. One-time use. Lookup by hash only. */
export function consumeUpgradeCode(code: string): UpgradeCodePayload | null {
	if (!/^[a-zA-Z0-9-]+$/.test(code) || code.length > 64) return null;
	const db = getDb();
	const hashed = hashToken(code);
	const row = db
		.prepare("SELECT token, target_user_kind, expires_at FROM upgrade_tokens WHERE token = ?")
		.get(hashed) as { token: string; target_user_kind: string; expires_at: number } | undefined;
	if (!row) return null;
	if (row.expires_at < Date.now()) return null;
	if (row.target_user_kind !== "trusted" && row.target_user_kind !== "admin") return null;
	db.prepare("DELETE FROM upgrade_tokens WHERE token = ?").run(row.token);
	return {
		targetUserKind: row.target_user_kind as "trusted" | "admin",
		expiresAt: row.expires_at,
	};
}
