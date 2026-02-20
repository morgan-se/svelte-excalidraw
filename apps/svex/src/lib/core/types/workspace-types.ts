/**
 * Workspace kinds for svex (gated by config). Kind is implicit from roomId:
 * local = roomId.startsWith("remote-"), forever = roomId.includes("/"), else ephemeral.
 */
export type WorkspaceKind = "local" | "ephemeral" | "forever";

export interface RoomMetadata {
	createdAt: number;
	/** Last time doc was updated (ephemeral TTL from config). */
	lastUpdatedAt: number;
	/** Last time room was viewed. */
	viewedAt?: number;
	/** Display name. */
	name?: string;
	/** Description. */
	description?: string;
	/** For local only: host's userId; room is removed when host leaves. */
	hostUserId?: string;
}
