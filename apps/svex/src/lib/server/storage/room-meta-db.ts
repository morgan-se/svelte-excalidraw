/**
 * Server-only: room/whiteboard metadata in SQLite. Replaces meta.json.
 */
import { getDb } from "./db.js";
import type { RoomMetadata } from "$lib/core/types/workspace-types.js";

/** Parse roomId into workspace_id, collection, doc_id for whiteboards table. */
function parseRoomId(roomId: string): {
	workspaceId: string | null;
	collection: string | null;
	docId: string;
} {
	const parts = roomId.split("/");
	if (parts.length === 1) {
		return { workspaceId: null, collection: null, docId: roomId };
	}
	if (parts.length === 2) {
		return { workspaceId: parts[0]!, collection: null, docId: parts[1]! };
	}
	if (parts.length === 3) {
		return { workspaceId: parts[0]!, collection: parts[1]!, docId: parts[2]! };
	}
	return { workspaceId: null, collection: null, docId: roomId };
}

export function getWhiteboard(roomId: string): RoomMetadata | null {
	const db = getDb();
	const row = db.prepare("SELECT * FROM whiteboards WHERE id = ?").get(roomId) as {
		created_at: number;
		updated_at: number;
		viewed_at: number;
		name: string | null;
		description: string | null;
		host_user_id: string | null;
	} | undefined;
	if (!row) return null;
	return {
		createdAt: row.created_at,
		lastUpdatedAt: row.updated_at,
		viewedAt: row.viewed_at,
		name: row.name ?? undefined,
		description: row.description ?? undefined,
		hostUserId: row.host_user_id ?? undefined,
	};
}

export function upsertWhiteboard(roomId: string, meta: RoomMetadata): void {
	const db = getDb();
	const { workspaceId, collection, docId } = parseRoomId(roomId);
	const now = Date.now();
	db.prepare(
		`INSERT INTO whiteboards (id, workspace_id, collection, doc_id, name, description, created_at, updated_at, viewed_at, host_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       description = excluded.description,
       updated_at = excluded.updated_at,
       viewed_at = excluded.viewed_at,
       host_user_id = excluded.host_user_id`,
	).run(
		roomId,
		workspaceId,
		collection,
		docId,
		meta.name ?? null,
		meta.description ?? null,
		meta.createdAt ?? now,
		meta.lastUpdatedAt ?? now,
		meta.viewedAt ?? now,
		meta.hostUserId ?? null,
	);
}

export function deleteWhiteboard(roomId: string): void {
	getDb().prepare("DELETE FROM whiteboards WHERE id = ?").run(roomId);
}

/** Ensure ephemeral whiteboard row exists (required before adding session_grants FK). */
export function ensureEphemeralWhiteboard(roomId: string): void {
	const db = getDb();
	const exists = db.prepare("SELECT 1 FROM whiteboards WHERE id = ?").get(roomId);
	if (exists) return;
	const now = Date.now();
	db.prepare(
		`INSERT INTO whiteboards (id, workspace_id, collection, doc_id, name, description, created_at, updated_at, viewed_at, host_user_id)
     VALUES (?, NULL, NULL, ?, NULL, NULL, ?, ?, ?, NULL)`,
	).run(roomId, roomId, now, now, now);
}

export function touchUpdated(roomId: string): void {
	const now = Date.now();
	getDb().prepare("UPDATE whiteboards SET updated_at = ? WHERE id = ?").run(now, roomId);
}

export function touchViewed(roomId: string): void {
	const now = Date.now();
	getDb().prepare("UPDATE whiteboards SET viewed_at = ? WHERE id = ?").run(now, roomId);
}
