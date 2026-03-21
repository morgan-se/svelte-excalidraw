/**
 * Server-only: lifecycle cleanup (ephemeral rooms, sessions, orphaned workspaces).
 * Used by hooks (interval) and admin "trigger cleanup" action.
 */
import { getConfig } from "./config.js";
import { deleteRoomData } from "svelte-excalidraw/server/state";
import {
	loadRoom,
	deleteRoomFromDisk,
	listEphemeralIdsOnDisk,
	readRoomMetaFull,
} from "./storage/room-storage.js";
import {
	cleanupExpiredEphemeralRooms,
} from "./room-ttl.js";
import { cleanupExpiredSessions } from "./auth/session-storage.js";
import { deleteSessionFromStore } from "./auth/session-store.js";
import { cleanupOrphanedEmptyWorkspaces } from "./storage/workspace-store.js";

export function runLifecycleCleanup(): void {
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
	const sessionConfig = getConfig().session;
	const sessionDeleted = cleanupExpiredSessions(
		sessionConfig.ttlDays,
		sessionConfig.emptySessionRetentionDays,
	);
	for (const sid of sessionDeleted) {
		deleteSessionFromStore(sid);
	}
	cleanupOrphanedEmptyWorkspaces();
}
