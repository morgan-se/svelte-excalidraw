/**
 * Server-only: login link = static token stored in session. Reusable.
 * Claiming the link: this device takes over the session; the other is logged out.
 */
import { getDb } from "../storage/db.js";
import { loadSessionFromDisk } from "./session-storage.js";
import { deleteSessionFromStore } from "./session-store.js";

function sanitizeToken(token: string): string {
	return /^[a-zA-Z0-9-]+$/.test(token) && token.length <= 64 ? token : "";
}

/** Get or create the static login token for this session. Never expires. */
export function getOrCreateLoginToken(sid: string): string {
	const safe = /^[a-zA-Z0-9-]+$/.test(sid) && sid.length <= 64 ? sid : "";
	if (!safe) return "";
	const db = getDb();
	const row = db.prepare("SELECT login_token FROM sessions WHERE id = ?").get(safe) as {
		login_token: string | null;
	} | undefined;
	if (row?.login_token) return row.login_token;
	const token = crypto.randomUUID();
	db.prepare("UPDATE sessions SET login_token = ? WHERE id = ?").run(token, safe);
	return token;
}

/**
 * Claim session by token: this device takes over. Old session is deleted (other device logged out).
 * Returns new session id for the cookie, or null if token invalid.
 */
export function claimLoginToken(token: string): string | null {
	const safe = sanitizeToken(token);
	if (!safe) return null;
	const db = getDb();
	const row = db.prepare("SELECT id FROM sessions WHERE login_token = ?").get(safe) as {
		id: string;
	} | undefined;
	if (!row) return null;
	const oldSid = row.id;
	const data = loadSessionFromDisk(oldSid);
	if (!data) return null;
	const newSid = crypto.randomUUID();
	const now = Date.now();
	db.prepare(
		`INSERT INTO sessions (id, user_kind, username, color, created_at, last_presence_at, login_token)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
	).run(
		newSid,
		data.userKind,
		data.username ?? null,
		data.color ?? null,
		data.createdAt ?? now,
		data.lastPresenceAt ?? now,
		safe,
	);
	const grants = db.prepare("SELECT workspace_id, whiteboard_id, access FROM session_grants WHERE session_id = ?").all(
		oldSid,
	) as { workspace_id: string | null; whiteboard_id: string | null; access: string }[];
	const insertGrant = db.prepare(
		"INSERT INTO session_grants (session_id, workspace_id, whiteboard_id, access, added_at) VALUES (?, ?, ?, ?, ?)",
	);
	for (const g of grants) {
		insertGrant.run(newSid, g.workspace_id, g.whiteboard_id, g.access, now);
	}
	db.prepare("DELETE FROM sessions WHERE id = ?").run(oldSid);
	deleteSessionFromStore(oldSid);
	return newSid;
}
