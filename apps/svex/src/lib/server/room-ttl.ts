/**
 * Room TTL and metadata: ephemeral TTL from config, close room when host leaves for local.
 * In-memory cache + SQLite persistence.
 */
import { deleteRoomData } from "svelte-excalidraw/server/state";
import type { RoomMetadata } from "$lib/core/types/workspace-types.js";
import { getConfig } from "./config.js";
import {
	getWhiteboard,
	upsertWhiteboard,
	deleteWhiteboard,
	touchUpdated,
	touchViewed,
} from "./storage/room-meta-db.js";

function getEphemeralTtlMs(): number {
	return getConfig().ephemeral.ttlHours * 60 * 60 * 1000;
}

const roomMetadata = new Map<string, RoomMetadata>();

/** Local rooms (remote-xxx/...) are client-side only; no backend DB. */
function isLocalRoom(roomId: string): boolean {
	return roomId.startsWith("remote-");
}

export function getRoomMetadata(roomId: string): RoomMetadata | null {
	const cached = roomMetadata.get(roomId);
	if (cached) return cached;
	if (isLocalRoom(roomId)) return null;
	const fromDb = getWhiteboard(roomId);
	if (fromDb) {
		roomMetadata.set(roomId, fromDb);
		return fromDb;
	}
	return null;
}

export function setRoomMetadata(roomId: string, meta: RoomMetadata): void {
	roomMetadata.set(roomId, meta);
	if (!isLocalRoom(roomId)) upsertWhiteboard(roomId, meta);
}

export function setRoomMetadataFromLoad(roomId: string, meta: RoomMetadata): void {
	roomMetadata.set(roomId, meta);
	if (!isLocalRoom(roomId)) upsertWhiteboard(roomId, meta);
}

export function touchRoom(roomId: string): void {
	const m = roomMetadata.get(roomId);
	if (m) {
		m.lastUpdatedAt = Date.now();
		if (!isLocalRoom(roomId)) touchUpdated(roomId);
	}
}

export function touchViewedAt(roomId: string): void {
	const m = roomMetadata.get(roomId);
	if (m) m.viewedAt = Date.now();
	if (!isLocalRoom(roomId)) touchViewed(roomId);
}

export function onUserLeft(roomId: string, userId: string): void | { closeRoom: true } {
	const m = roomMetadata.get(roomId);
	if (!m) return;
	if (roomId.startsWith("remote-") && m.hostUserId === userId) {
		roomMetadata.delete(roomId);
		deleteWhiteboard(roomId);
		return { closeRoom: true };
	}
}

function isEphemeralRoom(roomId: string): boolean {
	return !roomId.startsWith("remote-") && !roomId.includes("/");
}

export function getEphemeralRemainingMs(roomId: string): number | null {
	const m = roomMetadata.get(roomId);
	if (!m || !isEphemeralRoom(roomId)) return null;
	return m.lastUpdatedAt + getEphemeralTtlMs() - Date.now();
}

export function isEphemeralExpired(roomId: string): boolean {
	const m = roomMetadata.get(roomId);
	if (!m || !isEphemeralRoom(roomId)) return false;
	return Date.now() - m.lastUpdatedAt > getEphemeralTtlMs();
}

export function checkEphemeralTtl(roomId: string): boolean {
	const m = roomMetadata.get(roomId);
	if (!m || !isEphemeralRoom(roomId)) return false;
	if (Date.now() - m.lastUpdatedAt > getEphemeralTtlMs()) {
		roomMetadata.delete(roomId);
		deleteWhiteboard(roomId);
		deleteRoomData(roomId);
		return true;
	}
	return false;
}

export function refreshEphemeral(roomId: string): boolean {
	const m = roomMetadata.get(roomId);
	if (!m || !isEphemeralRoom(roomId)) return false;
	m.lastUpdatedAt = Date.now();
	touchUpdated(roomId);
	return true;
}

export function cleanupExpiredEphemeralRooms(): string[] {
	const deleted: string[] = [];
	for (const roomId of roomMetadata.keys()) {
		if (checkEphemeralTtl(roomId)) deleted.push(roomId);
	}
	return deleted;
}
