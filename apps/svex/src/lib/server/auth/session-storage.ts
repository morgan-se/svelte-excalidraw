/**
 * Server-only: persist sessions to SQLite (sessions + session_grants tables).
 */
import type { SessionData, EphemeralRoom, GrantAccess } from "$lib/core/types/session-types.js";
import { getDb } from "../storage/db.js";

function sanitizeSid(sid: string): string {
	return /^[a-zA-Z0-9-]+$/.test(sid) && sid.length <= 64 ? sid : "";
}

export function loadSessionFromDisk(sid: string): SessionData | null {
	const safe = sanitizeSid(sid);
	if (!safe) return null;
	const db = getDb();
	const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get(safe) as {
		user_kind: string;
		username: string | null;
		color: string | null;
		created_at: number | null;
		last_presence_at: number | null;
	} | undefined;
	if (!row) return null;
	const userKind =
		row.user_kind === "trusted" || row.user_kind === "admin" ? row.user_kind : "guest";
	const workspaceGrants: Record<string, GrantAccess> = {};
	const ephemeralGrants: Record<string, GrantAccess> = {};
	const whiteboardGrants: Record<string, GrantAccess> = {};
	const workspaceIds: string[] = [];
	const ephemeralRooms: EphemeralRoom[] = [];
	const grants = db.prepare("SELECT * FROM session_grants WHERE session_id = ?").all(safe) as {
		workspace_id: string | null;
		whiteboard_id: string | null;
		access: string;
		last_updated_at: number | null;
	}[];
	for (const g of grants) {
		const access = (g.access === "read" || g.access === "readWrite" ? g.access : "read") as GrantAccess;
		if (g.workspace_id) {
			workspaceGrants[g.workspace_id] = access;
			if (!workspaceIds.includes(g.workspace_id)) workspaceIds.push(g.workspace_id);
		} else if (g.whiteboard_id) {
			if (g.whiteboard_id.includes("/")) {
				whiteboardGrants[g.whiteboard_id] = access;
			} else {
				ephemeralGrants[g.whiteboard_id] = access;
				ephemeralRooms.push({
					id: g.whiteboard_id,
					lastUpdatedAt: g.last_updated_at ?? undefined,
				});
			}
		}
	}
	return {
		userKind,
		username: row.username?.trim() || undefined,
		color: row.color?.trim() || undefined,
		createdAt: row.created_at ?? undefined,
		lastPresenceAt: row.last_presence_at ?? undefined,
		workspaceIds,
		ephemeralRooms,
		workspaceGrants: Object.keys(workspaceGrants).length ? workspaceGrants : undefined,
		ephemeralGrants: Object.keys(ephemeralGrants).length ? ephemeralGrants : undefined,
		whiteboardGrants: Object.keys(whiteboardGrants).length ? whiteboardGrants : undefined,
	};
}

export function saveSessionToDisk(sid: string, data: SessionData): void {
	const safe = sanitizeSid(sid);
	if (!safe) return;
	const db = getDb();
	const now = Date.now();
	db.prepare(
		`INSERT INTO sessions (id, user_kind, username, color, created_at, last_presence_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       user_kind = excluded.user_kind,
       username = excluded.username,
       color = excluded.color,
       last_presence_at = excluded.last_presence_at`,
	).run(
		safe,
		data.userKind,
		data.username ?? null,
		data.color ?? null,
		data.createdAt ?? now,
		data.lastPresenceAt ?? now,
	);
	db.prepare("DELETE FROM session_grants WHERE session_id = ?").run(safe);
	const allGrants: { workspace_id: string | null; whiteboard_id: string | null; access: string }[] = [];
	for (const [k, v] of Object.entries(data.workspaceGrants ?? {})) {
		allGrants.push({ workspace_id: k, whiteboard_id: null, access: v });
	}
	for (const [k, v] of Object.entries(data.ephemeralGrants ?? {})) {
		allGrants.push({ workspace_id: null, whiteboard_id: k, access: v });
	}
	for (const [k, v] of Object.entries(data.whiteboardGrants ?? {})) {
		allGrants.push({ workspace_id: null, whiteboard_id: k, access: v });
	}
	const insertGrant = db.prepare(
		"INSERT INTO session_grants (session_id, workspace_id, whiteboard_id, access, added_at) VALUES (?, ?, ?, ?, ?)",
	);
	for (const g of allGrants) {
		insertGrant.run(safe, g.workspace_id, g.whiteboard_id, g.access, now);
	}
}

export function updateSessionFingerprint(sid: string, fingerprint: string): void {
	const safe = sanitizeSid(sid);
	if (!safe || !fingerprint?.trim()) return;
	getDb().prepare("UPDATE sessions SET fingerprint = ? WHERE id = ?").run(fingerprint.trim(), safe);
}

/** List all session ids in DB (for debugging/admin). */
export function listSessionIdsOnDisk(): string[] {
	const rows = getDb().prepare("SELECT id FROM sessions").all() as { id: string }[];
	return rows.map((r) => r.id);
}

/** Delete expired sessions from DB. Returns deleted session ids. */
export function cleanupExpiredSessions(ttlDays: number, emptyRetentionDays: number): string[] {
	const db = getDb();
	const now = Date.now();
	const ttlMs = ttlDays * 24 * 60 * 60 * 1000;
	const emptyMs = emptyRetentionDays * 24 * 60 * 60 * 1000;
	const ttlCutoff = now - ttlMs;
	const emptyCutoff = now - emptyMs;
	const rows = db
		.prepare(
			`SELECT id FROM sessions WHERE
        (last_presence_at IS NOT NULL AND last_presence_at < ?)
        OR (last_presence_at IS NULL AND created_at < ?)
        OR (id IN (SELECT s.id FROM sessions s LEFT JOIN session_grants g ON s.id = g.session_id WHERE g.session_id IS NULL) AND created_at < ?)`,
		)
		.all(ttlCutoff, ttlCutoff, emptyCutoff) as { id: string }[];
	const ids = rows.map((r) => r.id);
	for (const id of ids) {
		db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
	}
	return ids;
}
