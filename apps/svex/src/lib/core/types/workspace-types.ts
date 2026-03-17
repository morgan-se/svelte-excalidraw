/**
 * Workspace kinds for svex (gated by config). Kind is implicit from roomId:
 * local = roomId.startsWith("remote-"), forever = roomId.includes("/"), else ephemeral.
 */
export type WorkspaceKind = "local" | "ephemeral" | "forever";

/**
 * Metadata embedded in scene JSON (svexMeta). Same shape for local .excalidraw and server scene.json.
 * Dir/file is source of truth; SQLite on server is a fast index that can be rebuilt from files.
 */
export interface SvexSceneMeta {
	createdAt: number;
	updatedAt: number;
	/** Last time opened/viewed – for "recent" sort and ephemeral TTL. */
	viewedAt?: number;
	/** Display name (travels with file; not tied to filename/docId). */
	name?: string;
	/** Optional description. */
	description?: string;
}

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
