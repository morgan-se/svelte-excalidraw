/**
 * Server-only: share links for whiteboards. One-time use.
 * TTL: max 24h, or for ephemeral rooms: min(24h, remaining room liveness).
 */
import { getDb } from "../storage/db.js";
import { getConfig } from "../config.js";
import { getWhiteboard } from "../storage/room-meta-db.js";
import type { GrantAccess } from "$lib/core/types/session-types.js";

const MAX_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export type ShareTokenKind = "workspace" | "ephemeral" | "local";

export interface ShareTokenPayload {
	kind: ShareTokenKind;
	workspaceId?: string;
	roomId: string;
	access: GrantAccess;
	expiresAt: number;
}

function computeExpiresAt(kind: ShareTokenKind, roomId: string): number {
	const now = Date.now();
	const maxExpiry = now + MAX_TTL_MS;
	if (kind !== "ephemeral") return maxExpiry;
	const meta = getWhiteboard(roomId);
	if (!meta) return maxExpiry;
	const ttlMs = getConfig().ephemeral.ttlHours * 60 * 60 * 1000;
	const roomExpiry = meta.lastUpdatedAt + ttlMs;
	return Math.min(maxExpiry, roomExpiry);
}

export function createShareToken(payload: Omit<ShareTokenPayload, "expiresAt">): {
	token: string;
	expiresAt: number;
} {
	const token = crypto.randomUUID();
	const expiresAt = computeExpiresAt(payload.kind, payload.roomId);
	getDb()
		.prepare(
			"INSERT INTO share_tokens (token, kind, workspace_id, room_id, access, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
		)
		.run(
			token,
			payload.kind,
			payload.workspaceId ?? null,
			payload.roomId,
			payload.access,
			expiresAt,
		);
	return { token, expiresAt };
}

/** Consume token: return payload if valid and not expired; delete. One-time use. */
export function consumeShareToken(token: string): ShareTokenPayload | null {
	if (!/^[a-zA-Z0-9-]+$/.test(token) || token.length > 64) return null;
	const db = getDb();
	const row = db.prepare("SELECT * FROM share_tokens WHERE token = ?").get(token) as {
		kind: string;
		workspace_id: string | null;
		room_id: string;
		access: string;
		expires_at: number;
	} | undefined;
	if (!row) return null;
	db.prepare("DELETE FROM share_tokens WHERE token = ?").run(token);
	if (row.expires_at < Date.now()) return null;
	if (row.kind !== "workspace" && row.kind !== "ephemeral" && row.kind !== "local") return null;
	if (row.access !== "read" && row.access !== "readWrite") return null;
	if ((row.kind === "workspace" || row.kind === "local") && !row.workspace_id) return null;
	return {
		kind: row.kind as ShareTokenKind,
		workspaceId: row.workspace_id ?? undefined,
		roomId: row.room_id,
		access: row.access as GrantAccess,
		expiresAt: row.expires_at,
	};
}
