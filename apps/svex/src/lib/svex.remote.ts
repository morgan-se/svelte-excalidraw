/**
 * SvelteKit Remote (query/command) – no fetch, type-safe RPC.
 */
import * as v from "valibot";
import { query, command, getRequestEvent } from "$app/server";
import { getRoomDocument } from "svelte-excalidraw/server/state";
import {
	getOrCreateSessionId,
	updateSession,
	SESSION_COOKIE,
	getSessionCookieOptions,
} from "$lib/server/auth/session-cookie.js";
import { updateSessionFingerprint } from "$lib/server/auth/session-storage.js";
import { getOrCreateLoginToken } from "$lib/server/auth/login-token.js";
import { createShareToken } from "$lib/server/auth/share-token.js";
import {
	getSession,
	patchSession,
	mergeSession,
	setSession,
	deleteSessionFromStore,
} from "$lib/server/auth/session-store.js";
import { deleteSessionFromDb, getSessionFingerprint } from "$lib/server/auth/session-storage.js";
import {
	createUpgradeCode as createUpgradeCodeStore,
	consumeUpgradeCode,
} from "$lib/server/auth/upgrade-code.js";
import {
	checkRateLimit,
	getUpgradeLimit,
	isRateLimitEnabledForSensitiveRoutes,
} from "$lib/server/auth/rate-limit.js";
import { logSecurityEvent } from "$lib/server/auth/security-events.js";
import { loadRoom, deleteRoomFromDisk } from "$lib/server/storage/room-storage.js";
import { refreshEphemeral } from "$lib/server/room-ttl.js";
import {
	createWorkspace as createWorkspaceStore,
	deleteWorkspace as deleteWorkspaceStore,
	createWhiteboardInWorkspace as createWhiteboardInWorkspaceStore,
	addWhiteboardToWorkspace,
	removeWhiteboardFromWorkspace,
	getWorkspaceCollections,
	createCollection as createCollectionStore,
	deleteCollection as deleteCollectionStore,
	renameCollection as renameCollectionStore,
	addWhiteboardToCollection as addWhiteboardToCollectionStore,
	removeWhiteboardFromCollection as removeWhiteboardFromCollectionStore,
	renameWhiteboard as renameWhiteboardStore,
} from "$lib/server/storage/workspace-store.js";
import { ensureEphemeralWhiteboard } from "$lib/server/storage/room-meta-db.js";
import { deleteRoomData } from "svelte-excalidraw/server/state";
import { generateRoomCode } from "$lib/core/room-code.js";
import { toInternalRoomIdLocal } from "$lib/client/local/local-room-id.js";
import { getConfig } from "$lib/server/config.js";
import { canCreate } from "$lib/config.js";

type SceneDoc = { elements: unknown[]; files: Record<string, unknown> };

const id = v.pipe(v.string(), v.minLength(1));
const workspaceId = id;
const whiteboardId = id;
const collection = id;

export const refreshEphemeralRoom = command(id, async (roomId) => {
	return refreshEphemeral(roomId);
});

export const getRoomScene = query(id, async (roomId): Promise<SceneDoc> => {
	const doc = getRoomDocument(roomId) ?? loadRoom(roomId);
	return doc ?? { elements: [], files: {} };
});

const workspaceWhiteboardSchema = v.object({
	workspaceId,
	whiteboardId,
	collection: v.optional(v.string()),
});

export const getWorkspaceWhiteboardScene = query(workspaceWhiteboardSchema, async (payload): Promise<SceneDoc> => {
	const roomId = payload.collection
		? `${payload.workspaceId}/${payload.collection}/${payload.whiteboardId}`
		: `${payload.workspaceId}/${payload.whiteboardId}`;
	const doc = getRoomDocument(roomId) ?? loadRoom(roomId);
	return doc ?? { elements: [], files: {} };
});

export const getRemoteRoomScene = query(
	v.object({ workspaceId, segmentId: id }),
	async (payload): Promise<SceneDoc> => {
		const roomId = toInternalRoomIdLocal(payload.workspaceId, payload.segmentId);
		const doc = getRoomDocument(roomId);
		return doc ?? { elements: [], files: {} };
	},
);

export const createWorkspace = command(v.string(), async (slug): Promise<{ workspaceId: string } | { error: string }> => {
	const event = getRequestEvent();
	if (!event) {
		logSecurityEvent({ type: "command_failure", route: "createWorkspace", outcome: "failure" }, undefined);
		return { error: "No request context" };
	}
	const config = getConfig();
	const sid = getOrCreateSessionId(event.cookies);
	const session = getSession(sid);
	const userKind = session.userKind ?? "guest";
	if (!canCreate(userKind, config.workspace.createAllowedFor)) {
		logSecurityEvent({ type: "command_failure", route: "createWorkspace", outcome: "failure" }, undefined);
		return { error: "Not allowed to create workspaces" };
	}
	try {
		const wid = createWorkspaceStore(slug.trim().toLowerCase() || undefined);
		patchSession(sid, {
			addWorkspace: wid,
			addWorkspaceGrant: { workspaceId: wid, access: "readWrite" },
		});
		return { workspaceId: wid };
	} catch (err) {
		logSecurityEvent({ type: "command_failure", route: "createWorkspace", outcome: "failure" }, undefined);
		return { error: err instanceof Error ? err.message : "Failed to create workspace" };
	}
});

const createWhiteboardSchema = v.union([
	v.string(),
	v.object({
		workspaceId: v.string(),
		name: v.optional(v.string()),
		collection: v.optional(v.string()),
	}),
]);

export const createWhiteboard = command(createWhiteboardSchema, async (payload): Promise<{ whiteboardId: string } | { error: string }> => {
	const { workspaceId, name, collection } =
		typeof payload === "string" ? { workspaceId: payload, name: undefined, collection: undefined } : payload;
	const result = createWhiteboardInWorkspaceStore(workspaceId, name);
	if ("error" in result || !collection) return result;
	addWhiteboardToCollectionStore(workspaceId, collection, result.whiteboardId);
	return result;
});

export const deleteWhiteboard = command(workspaceWhiteboardSchema, async (payload): Promise<void> => {
	const roomId = payload.collection
		? `${payload.workspaceId}/${payload.collection}/${payload.whiteboardId}`
		: `${payload.workspaceId}/${payload.whiteboardId}`;
	deleteRoomData(roomId);
	deleteRoomFromDisk(roomId);
	removeWhiteboardFromWorkspace(payload.workspaceId, payload.whiteboardId);
});

const sessionUpdateProfileSchema = v.object({
	username: v.optional(v.string()),
	color: v.optional(v.string()),
	fingerprint: v.optional(v.string()),
});

/** Sync profile (username, color, fingerprint) from client to server session. */
export const sessionUpdateProfile = command(sessionUpdateProfileSchema, async (payload) => {
	const event = getRequestEvent();
	if (!event) return;
	const sid = getOrCreateSessionId(event.cookies);
	if (payload.fingerprint?.trim()) {
		updateSessionFingerprint(sid, payload.fingerprint);
	}
	return updateSession(event.cookies, {
		username: payload.username?.trim() || undefined,
		color: payload.color?.trim() || undefined,
	});
});

/** Create a login link: open it elsewhere to take over this session (other device is logged out). Reusable. */
export const createLoginLink = command(v.undefined(), async () => {
	const event = getRequestEvent();
	if (!event) return { error: "No request context" };
	const sid = getOrCreateSessionId(event.cookies);
	getSession(sid); // ensure session exists in DB
	const token = getOrCreateLoginToken(sid);
	if (!token) return { error: "Could not create login token" };
	const origin = event.url.origin;
	const url = `${origin}/login/claim/${token}`;
	return { url };
});

/** Add workspace to session so it appears on landing and is cloned with login link. */
export const sessionAddWorkspace = command(workspaceId, async (workspaceId) => {
	const event = getRequestEvent();
	if (!event) return;
	const sid = getOrCreateSessionId(event.cookies);
	return patchSession(sid, {
		addWorkspace: workspaceId,
		addWorkspaceGrant: { workspaceId, access: "readWrite" },
	});
});

const sessionAddEphemeralSchema = v.object({
	id: v.string(),
	lastUpdatedAt: v.optional(v.number()),
});

/** Add ephemeral room to session so it appears on landing and is cloned with login link. */
export const sessionAddEphemeral = command(sessionAddEphemeralSchema, async (payload) => {
		const event = getRequestEvent();
		if (!event) return;
		const config = getConfig();
		const sid = getOrCreateSessionId(event.cookies);
		const session = getSession(sid);
		const userKind = session.userKind ?? "guest";
		if (!canCreate(userKind, config.ephemeral.createAllowedFor)) {
			return; // Silently reject; UI should not show the button
		}
		ensureEphemeralWhiteboard(payload.id);
		return patchSession(sid, {
			addEphemeral: payload,
			addEphemeralGrant: { id: payload.id, access: "readWrite" },
		});
	},
);

/** Remove expired ephemeral from session. */
export const sessionRemoveEphemeral = command(id, async (id) => {
	const event = getRequestEvent();
	if (!event) return;
	const sid = getOrCreateSessionId(event.cookies);
	return patchSession(sid, { removeEphemeral: id });
});

/** Delete workspace (owner only). Removes all data. */
export const deleteWorkspace = command(workspaceId, async (workspaceId) => {
	const event = getRequestEvent();
	if (!event) return { error: "No request context" };
	const sid = getOrCreateSessionId(event.cookies);
	const session = getSession(sid);
	const access = session.workspaceGrants?.[workspaceId];
	if (access !== "readWrite") return { error: "Only workspace owner can delete" };
	const ok = deleteWorkspaceStore(workspaceId);
	if (!ok) return { error: "Workspace not found" };
	return patchSession(sid, { removeWorkspaceGrant: workspaceId });
});

/** Leave workspace (remove from session). */
export const leaveWorkspace = command(workspaceId, async (workspaceId) => {
	const event = getRequestEvent();
	if (!event) return;
	const sid = getOrCreateSessionId(event.cookies);
	return patchSession(sid, { removeWorkspaceGrant: workspaceId });
});

/** Leave ephemeral room (remove grant; for rooms you joined via link). */
export const leaveEphemeralRoom = command(id, async (id) => {
	const event = getRequestEvent();
	if (!event) return;
	const sid = getOrCreateSessionId(event.cookies);
	return patchSession(sid, { removeEphemeralGrant: id });
});

/** Delete ephemeral room (remove from session + delete data; for rooms you created). */
export const deleteEphemeralRoom = command(id, async (id) => {
	const event = getRequestEvent();
	if (!event) return;
	const sid = getOrCreateSessionId(event.cookies);
	deleteRoomData(id);
	deleteRoomFromDisk(id);
	return patchSession(sid, { removeEphemeral: id, removeEphemeralGrant: id });
});

/** Get collections for a workspace. */
export const getCollections = query(workspaceId, async (workspaceId) => {
	return getWorkspaceCollections(workspaceId);
});

export const createCollection = command(
	v.object({ workspaceId, name: v.pipe(v.string(), v.minLength(1)) }),
	async (payload): Promise<{ collection: string } | { error: string }> => {
		return createCollectionStore(payload.workspaceId, payload.name);
	},
);

export const deleteCollection = command(
	v.object({ workspaceId, collection }),
	async (payload): Promise<boolean> => {
		return deleteCollectionStore(payload.workspaceId, payload.collection);
	},
);

export const addWhiteboardToCollection = command(
	v.object({ workspaceId, collection, whiteboardId }),
	async (payload): Promise<boolean> => {
		return addWhiteboardToCollectionStore(payload.workspaceId, payload.collection, payload.whiteboardId);
	},
);

export const removeWhiteboardFromCollection = command(
	v.object({ workspaceId, collection, whiteboardId }),
	async (payload): Promise<boolean> => {
		return removeWhiteboardFromCollectionStore(payload.workspaceId, payload.collection, payload.whiteboardId);
	},
);

export const renameCollection = command(
	v.object({
		workspaceId,
		oldCollection: collection,
		newCollection: v.string(),
		displayName: v.optional(v.string()),
	}),
	async (payload): Promise<boolean> => {
		return renameCollectionStore(
			payload.workspaceId,
			payload.oldCollection,
			payload.newCollection,
			payload.displayName,
		);
	},
);

export const renameWhiteboard = command(
	v.object({
		workspaceId,
		oldId: id,
		newId: id,
		collection: v.optional(v.string()),
		displayName: v.optional(v.string()),
	}),
	async (payload): Promise<boolean> => {
		const roomId = payload.collection
			? `${payload.workspaceId}/${payload.collection}/${payload.oldId}`
			: `${payload.workspaceId}/${payload.oldId}`;
		const ok = renameWhiteboardStore(
			payload.workspaceId,
			payload.oldId,
			payload.newId,
			payload.collection,
			payload.displayName,
		);
		if (ok) deleteRoomData(roomId);
		return ok;
	},
);

const GENERIC_UPGRADE_ERROR = "Invalid or expired code";

/** Upgrade session with one-time code. Returns ok or error. Generic message to avoid token-state disclosure. */
export const upgradeWithCode = command(
	v.string(),
	async (code): Promise<{ ok: true; targetUserKind: "trusted" | "admin" } | { error: string }> => {
		const event = getRequestEvent();
		if (!event) return { error: GENERIC_UPGRADE_ERROR };

		const clientAddress = typeof event.getClientAddress === "function" ? event.getClientAddress() : "unknown";
		const sid = getOrCreateSessionId(event.cookies);
		const fingerprint = getSessionFingerprint(sid) ?? "";
		const rateLimitKey = `upgrade:${clientAddress}:${fingerprint}`;
		if (isRateLimitEnabledForSensitiveRoutes()) {
			const allowed = checkRateLimit(rateLimitKey, getUpgradeLimit());
			if (!allowed) {
				logSecurityEvent(
					{ type: "upgrade_invalid", route: "upgrade", outcome: "rate_limited" },
					clientAddress,
				);
				return { error: GENERIC_UPGRADE_ERROR };
			}
		}

		const payload = consumeUpgradeCode(code.trim());
		if (!payload) {
			logSecurityEvent(
				{ type: "upgrade_invalid", route: "upgrade", outcome: "failure" },
				clientAddress,
			);
			return { error: GENERIC_UPGRADE_ERROR };
		}
		logSecurityEvent(
			{ type: "upgrade_consumed", route: "upgrade", outcome: "success" },
			clientAddress,
		);

		const current = getSession(sid);
		const newSid = crypto.randomUUID();
		const newData = {
			...current,
			userKind: payload.targetUserKind,
		};
		setSession(newSid, newData);
		deleteSessionFromDb(sid);
		deleteSessionFromStore(sid);
		event.cookies.set(SESSION_COOKIE, newSid, getSessionCookieOptions());
		return { ok: true, targetUserKind: payload.targetUserKind };
	},
);

/** Create one-time upgrade code. Trusted can create trusted; admin can create trusted or admin. */
export const createUpgradeCodeRemote = command(
	v.picklist(["trusted", "admin"]),
	async (targetUserKind): Promise<{ code: string; expiresAt: number } | { error: string }> => {
		const event = getRequestEvent();
		if (!event) return { error: "No request context" };

		const sid = getOrCreateSessionId(event.cookies);
		const session = getSession(sid);
		const creator = session.userKind ?? "guest";

		if (creator !== "trusted" && creator !== "admin") {
			return { error: "Only trusted or admin can create upgrade codes" };
		}
		if (targetUserKind === "admin" && creator !== "admin") {
			return { error: "Only admin can create admin upgrade codes" };
		}
		if (targetUserKind === "trusted" && creator === "trusted") {
			// ok
		} else if (targetUserKind === "admin" && creator === "admin") {
			// ok
		}

		const { code, expiresAt } = createUpgradeCodeStore(targetUserKind);
		return { code, expiresAt };
	},
);

const createShareLinkSchema = v.object({
	workspaceId: v.string(),
	roomId: v.string(),
	access: v.picklist(["read", "readWrite"]),
	kind: v.optional(v.picklist(["local", "workspace", "ephemeral"])),
});

/** Create a share link (read or readWrite). Returns URL and expiry. */
export const createShareLink = command(createShareLinkSchema, async (payload): Promise<{ url: string; expiresAt: number } | { error: string }> => {
		const event = getRequestEvent();
		if (!event) {
			logSecurityEvent({ type: "command_failure", route: "createShareLink", outcome: "failure" }, undefined);
			return { error: "No request context" };
		}
		const kind =
			payload.kind ?? (payload.workspaceId === "ephemeral" ? "ephemeral" : "workspace");
		const workspaceId = kind === "workspace" || kind === "local" ? payload.workspaceId : undefined;
		try {
			const { token, expiresAt } = createShareToken({
				kind,
				workspaceId,
				roomId: payload.roomId,
				access: payload.access,
			});
			const url = `${event.url.origin}/join/${token}`;
			return { url, expiresAt };
		} catch (err) {
			const msg = err instanceof Error ? err.message : "";
			const error =
				msg === "Share links are disabled for this workspace"
					? msg
					: "Failed to create share link";
			logSecurityEvent({ type: "command_failure", route: "createShareLink", outcome: "failure" }, undefined);
			return { error };
		}
	},
);

