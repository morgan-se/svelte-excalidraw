/**
 * Server-only: identity layer (Section 9). Accounts for trusted/admin with argon2id passwords.
 * Session–account binding; no plaintext password storage/logging.
 */
import argon2 from "argon2";
import { getDb } from "../storage/db.js";
import { getSession, setSession } from "./session-store.js";
import { loadSessionFromDisk, saveSessionToDisk } from "./session-storage.js";
import { deleteSessionFromDb } from "./session-storage.js";
import { deleteSessionFromStore } from "./session-store.js";

const ARGON2_OPTS = {
	type: argon2.argon2id,
	memoryCost: 65536,
	timeCost: 3,
};

export type AccountRole = "trusted" | "admin";

export interface Account {
	id: string;
	username: string;
	role: AccountRole;
	createdAt: number;
	updatedAt: number;
}

const USERNAME_MIN = 2;
const USERNAME_MAX = 64;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;
const PASSWORD_MIN = 8;

function sanitizeUsername(username: string): string {
	const t = username.trim();
	return t.length >= USERNAME_MIN && t.length <= USERNAME_MAX && USERNAME_REGEX.test(t) ? t : "";
}

/** Hash password with argon2id. Never log or store plaintext. */
export async function hashPassword(password: string): Promise<string> {
	return argon2.hash(password, ARGON2_OPTS);
}

/** Verify password against hash. Returns true if match. */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
	try {
		return await argon2.verify(hash, password);
	} catch {
		return false;
	}
}

/** Create account (trusted or admin). Returns error message or account. */
export async function createAccount(
	username: string,
	password: string,
	role: AccountRole,
): Promise<{ account: Account } | { error: string }> {
	const safe = sanitizeUsername(username);
	if (!safe) return { error: "Invalid username: 2–64 chars, letters, numbers, underscore, hyphen" };
	if (password.length < PASSWORD_MIN) return { error: "Password must be at least 8 characters" };

	const db = getDb();
	const existing = db.prepare("SELECT id FROM accounts WHERE username = ?").get(safe) as { id: string } | undefined;
	if (existing) return { error: "Username already taken" };

	const id = crypto.randomUUID();
	const now = Date.now();
	const passwordHash = await hashPassword(password);
	db.prepare(
		"INSERT INTO accounts (id, username, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
	).run(id, safe, passwordHash, role, now, now);

	return {
		account: { id, username: safe, role, createdAt: now, updatedAt: now },
	};
}

/** Get account by username. */
export function getAccountByUsername(username: string): Account | null {
	const safe = sanitizeUsername(username);
	if (!safe) return null;
	const row = getDb()
		.prepare("SELECT id, username, role, created_at, updated_at FROM accounts WHERE username = ?")
		.get(safe) as { id: string; username: string; role: string; created_at: number; updated_at: number } | undefined;
	if (!row || (row.role !== "trusted" && row.role !== "admin")) return null;
	return {
		id: row.id,
		username: row.username,
		role: row.role as AccountRole,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

/** Get account by session (if bound). */
export function getAccountBySessionId(sid: string): Account | null {
	const row = getDb()
		.prepare(
			"SELECT a.id, a.username, a.role, a.created_at, a.updated_at FROM accounts a JOIN session_account sa ON a.id = sa.account_id WHERE sa.session_id = ?",
		)
		.get(sid) as
		| { id: string; username: string; role: string; created_at: number; updated_at: number }
		| undefined;
	if (!row || (row.role !== "trusted" && row.role !== "admin")) return null;
	return {
		id: row.id,
		username: row.username,
		role: row.role as AccountRole,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

/** Bind session to account and set session userKind to account role. */
export function bindSessionToAccount(sid: string, accountId: string): void {
	const db = getDb();
	const now = Date.now();
	const acc = db.prepare("SELECT role FROM accounts WHERE id = ?").get(accountId) as { role: string } | undefined;
	if (!acc || (acc.role !== "trusted" && acc.role !== "admin")) return;

	db.prepare("INSERT OR REPLACE INTO session_account (session_id, account_id, bound_at) VALUES (?, ?, ?)").run(
		sid,
		accountId,
		now,
	);
	const session = getSession(sid);
	setSession(sid, { ...session, userKind: acc.role as "trusted" | "admin" });
	saveSessionToDisk(sid, { ...session, userKind: acc.role as "trusted" | "admin" });
}

/** Login with username + password: verify, create new session, bind to account. Returns new sid or error. */
export async function loginWithPassword(username: string, password: string): Promise<{ sid: string } | { error: string }> {
	const account = getAccountByUsername(username);
	if (!account) return { error: "Invalid username or password" };

	const db = getDb();
	const row = db.prepare("SELECT password_hash FROM accounts WHERE id = ?").get(account.id) as { password_hash: string } | undefined;
	if (!row) return { error: "Invalid username or password" };

	const ok = await verifyPassword(row.password_hash, password);
	if (!ok) return { error: "Invalid username or password" };

	const newSid = crypto.randomUUID();
	const data = getSession(newSid);
	setSession(newSid, { ...data, userKind: account.role });
	const now = Date.now();
	db.prepare("INSERT OR REPLACE INTO session_account (session_id, account_id, bound_at) VALUES (?, ?, ?)").run(
		newSid,
		account.id,
		now,
	);
	return { sid: newSid };
}

/** List session ids bound to this account (for security page). */
export function getSessionIdsForAccount(accountId: string): string[] {
	const rows = getDb()
		.prepare("SELECT session_id FROM session_account WHERE account_id = ? ORDER BY bound_at DESC")
		.all(accountId) as { session_id: string }[];
	return rows.map((r) => r.session_id);
}

/** List sessions bound to this account with last presence (for security page). */
export function getSessionsForAccount(accountId: string): { sessionId: string; lastPresenceAt: number | null }[] {
	const rows = getDb()
		.prepare(
			"SELECT sa.session_id, s.last_presence_at FROM session_account sa JOIN sessions s ON s.id = sa.session_id WHERE sa.account_id = ? ORDER BY sa.bound_at DESC",
		)
		.all(accountId) as { session_id: string; last_presence_at: number | null }[];
	return rows.map((r) => ({ sessionId: r.session_id, lastPresenceAt: r.last_presence_at }));
}

/** Change password for account (current password required). */
export async function changePassword(
	accountId: string,
	currentPassword: string,
	newPassword: string,
): Promise<{ ok: true } | { error: string }> {
	if (newPassword.length < PASSWORD_MIN) return { error: "New password must be at least 8 characters" };

	const db = getDb();
	const row = db.prepare("SELECT password_hash FROM accounts WHERE id = ?").get(accountId) as { password_hash: string } | undefined;
	if (!row) return { error: "Account not found" };

	const ok = await verifyPassword(row.password_hash, currentPassword);
	if (!ok) return { error: "Current password is incorrect" };

	const hash = await hashPassword(newPassword);
	const now = Date.now();
	db.prepare("UPDATE accounts SET password_hash = ?, updated_at = ? WHERE id = ?").run(hash, now, accountId);
	return { ok: true };
}

/** Unbind session from account (logout this device from account view). Clears binding and sets userKind to guest. */
export function unbindSession(sid: string): void {
	getDb().prepare("DELETE FROM session_account WHERE session_id = ?").run(sid);
	const session = getSession(sid);
	setSession(sid, { ...session, userKind: "guest" });
	saveSessionToDisk(sid, { ...session, userKind: "guest" });
}

/** Revoke another session (admin/security: invalidate a session bound to this account). Caller must ensure the target session belongs to the same account. */
export function revokeSessionForAccount(accountId: string, targetSid: string): boolean {
	const row = getDb()
		.prepare("SELECT 1 FROM session_account WHERE session_id = ? AND account_id = ?")
		.get(targetSid, accountId);
	if (!row) return false;
	deleteSessionFromDb(targetSid);
	deleteSessionFromStore(targetSid);
	getDb().prepare("DELETE FROM session_account WHERE session_id = ?").run(targetSid);
	return true;
}
