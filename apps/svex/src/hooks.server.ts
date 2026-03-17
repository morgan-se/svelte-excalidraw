import type { Handle } from "@sveltejs/kit";
import { getDb } from "$lib/server/storage/db.js";
import { ensureAdminUpgradeCodeAndLog } from "$lib/server/auth/upgrade-code.js";
import {
	setPersistCallback,
	setLoadCallback,
	setOnLeaveCallback,
} from "svelte-excalidraw/server/state";
import {
	loadRoom,
	createPersistCallback,
	deleteRoomFromDisk,
	listEphemeralIdsOnDisk,
	readRoomMetaFull,
} from "$lib/server/storage/room-storage.js";
import { getConfig } from "$lib/server/config.js";
import {
	onUserLeft,
	cleanupExpiredEphemeralRooms,
} from "$lib/server/room-ttl.js";
import { deleteRoomData } from "svelte-excalidraw/server/state";
import { cleanupExpiredSessions } from "$lib/server/auth/session-storage.js";
import { deleteSessionFromStore } from "$lib/server/auth/session-store.js";
import { cleanupOrphanedEmptyWorkspaces } from "$lib/server/storage/workspace-store.js";

// Persist: only ephemeral and forever; touch TTL and save doc + metadata
setPersistCallback(createPersistCallback());

// Load: restore from disk and register metadata for TTL
setLoadCallback((roomId: string) => {
	return loadRoom(roomId);
});

// When a user leaves: for local rooms, if host left, room is already deleted by room-ttl
setOnLeaveCallback(onUserLeft);

/** Lifecycle cleanup: ephemeral rooms, sessions, orphaned empty workspaces. Order: sessions first (so grants are gone), then workspaces. */
function runLifecycleCleanup(): void {
	// 1. Ephemeral: in-memory + disk
	const ephemeralDeleted = cleanupExpiredEphemeralRooms();
	for (const roomId of ephemeralDeleted) {
		deleteRoomFromDisk(roomId);
	}
	const ttlMs = getConfig().ephemeral.ttlHours * 60 * 60 * 1000;
	const now = Date.now();
	for (const roomId of listEphemeralIdsOnDisk()) {
		const meta = readRoomMetaFull(roomId);
		if (!meta) continue;
		if (now - meta.lastUpdatedAt > ttlMs) {
			deleteRoomData(roomId);
			deleteRoomFromDisk(roomId);
		}
	}
	// 2. Sessions (grants cascade)
	const sessionConfig = getConfig().session;
	const sessionDeleted = cleanupExpiredSessions(sessionConfig.ttlDays, sessionConfig.emptySessionRetentionDays);
	for (const sid of sessionDeleted) {
		deleteSessionFromStore(sid);
	}
	// 3. Orphaned empty workspaces (no grants, no whiteboards)
	cleanupOrphanedEmptyWorkspaces();
}

getDb(); // Initialize DB at startup
runLifecycleCleanup();

let adminCodeLogged = false;
export const handle: Handle = async ({ event, resolve }) => {
	if (!adminCodeLogged) {
		adminCodeLogged = true;
		ensureAdminUpgradeCodeAndLog(event.url.origin);
	}
	return resolve(event);
};

const cleanupIntervalMs = getConfig().storage.cleanupIntervalMinutes * 60 * 1000;
setInterval(runLifecycleCleanup, cleanupIntervalMs);
