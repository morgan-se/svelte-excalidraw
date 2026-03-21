/**
 * Server-only: share links for whiteboards. One-time use.
 * Persist hashed tokens only (HMAC-SHA256 + pepper); raw token shown once.
 */
import { getDb, isShareLinksDisabled } from "../storage/db.js";
import { getConfig } from "../config.js";
import { getWhiteboard } from "../storage/room-meta-db.js";
import type { GrantAccess } from "$lib/core/types/session-types.js";
import { hashToken } from "./token-utils.js";

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
	if (
		(payload.kind === "workspace" || payload.kind === "local") &&
		payload.workspaceId &&
		isShareLinksDisabled(payload.workspaceId)
	) {
		throw new Error("Share links are disabled for this workspace");
	}
	const rawToken = crypto.randomUUID();
	const stored = hashToken(rawToken);
	const expiresAt = computeExpiresAt(payload.kind, payload.roomId);
	const now = Date.now();
	getDb()
		.prepare(
			"INSERT INTO share_tokens (token, kind, workspace_id, room_id, access, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
		)
		.run(
			stored,
			payload.kind,
			payload.workspaceId ?? null,
			payload.roomId,
			payload.access,
			expiresAt,
			now,
		);
	return { token: rawToken, expiresAt };
}

/** Consume token: return payload if valid and not expired; delete. One-time use. Lookup by hash only. */
export function consumeShareToken(token: string): ShareTokenPayload | null {
	if (!/^[a-zA-Z0-9-]+$/.test(token) || token.length > 64) return null;
	const db = getDb();
	const hashed = hashToken(token);
	const row = db.prepare("SELECT * FROM share_tokens WHERE token = ?").get(hashed) as {
		token: string;
		kind: string;
		workspace_id: string | null;
		room_id: string;
		access: string;
		expires_at: number;
	} | undefined;
	if (!row) return null;
	if (row.expires_at < Date.now()) return null;
	if (row.kind !== "workspace" && row.kind !== "ephemeral" && row.kind !== "local") return null;
	if (row.access !== "read" && row.access !== "readWrite") return null;
	if ((row.kind === "workspace" || row.kind === "local") && !row.workspace_id) return null;
	db.prepare("DELETE FROM share_tokens WHERE token = ?").run(row.token);
	return {
		kind: row.kind as ShareTokenKind,
		workspaceId: row.workspace_id ?? undefined,
		roomId: row.room_id,
		access: row.access as GrantAccess,
		expiresAt: row.expires_at,
	};
}
