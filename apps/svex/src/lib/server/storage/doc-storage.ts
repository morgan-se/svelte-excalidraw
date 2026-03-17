/**
 * Server-only: persist/load excalidraw docs. Architecture is implicit:
 * - workspaceId/docId → data/workspaces/<workspaceId>/<docId>/
 * - ephemeral id → data/ephemerals/<id>/
 * - local (remote-*) → never on disk.
 * Scene JSON holds svexMeta (createdAt, updatedAt, etc.); SQLite is a fast index, file is source of truth.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { RoomMetadata } from "$lib/core/types/workspace-types.js";
import { getSvexMeta, ensureSvexMetaForSave, roomMetadataFromSvexMeta, SVEX_META_KEY } from "$lib/core/scene-meta.js";
import { getConfig } from "../config.js";
import { getRoomMetadata, setRoomMetadataFromLoad, touchRoom, touchViewedAt } from "../room-ttl.js";
import { getWhiteboard, deleteWhiteboard } from "./room-meta-db.js";
import { WORKSPACES_DIR, EPHEMERALS_DIR } from "./data-dir.js";

const SCENE_FILE = "scene.json";

type RoomDocument = { elements: unknown[]; files: Record<string, unknown>; [key: string]: unknown };

function safeSegment(s: string): string {
	return /^[a-zA-Z0-9_-]+$/.test(s) && s.length <= 128 ? s : "";
}

/** Extract workspaceId from roomId. Returns null for ephemeral or local. */
function roomIdToWorkspaceId(roomId: string): string | null {
	if (roomId.startsWith("remote-")) return null;
	const parts = roomId.split("/");
	if (parts.length >= 2 && safeSegment(parts[0]) && safeSegment(parts[1])) return parts[0];
	return null;
}

/** Sum bytes of all scene.json files under workspace dir. */
function getWorkspaceSizeBytes(workspaceId: string): number {
	const dir = join(WORKSPACES_DIR, safeSegment(workspaceId));
	if (!safeSegment(workspaceId) || !existsSync(dir)) return 0;
	let total = 0;
	function walk(d: string): void {
		const entries = readdirSync(d, { withFileTypes: true });
		for (const e of entries) {
			const p = join(d, e.name);
			if (e.isDirectory()) walk(p);
			else if (e.name === SCENE_FILE) total += statSync(p).size;
		}
	}
	try {
		walk(dir);
	} catch {
		// ignore
	}
	return total;
}

/** Get current scene.json size for room, or 0 if missing. */
function getCurrentRoomSizeBytes(roomId: string): number {
	const dir = roomIdToDocDir(roomId);
	if (!dir) return 0;
	const path = join(dir, SCENE_FILE);
	try {
		return existsSync(path) ? statSync(path).size : 0;
	} catch {
		return 0;
	}
}

/** Resolve roomId to disk path (dir containing scene.json). Returns null for local or invalid.
 * - workspaceId/docId → root whiteboard
 * - workspaceId/collection/docId → collection whiteboard (collection = subdir)
 */
function roomIdToDocDir(roomId: string): string | null {
	if (roomId.startsWith("remote-")) return null;
	const parts = roomId.split("/");
	if (parts.length === 2) {
		const [workspaceId, docId] = parts.map(safeSegment);
		if (!workspaceId || !docId) return null;
		return join(WORKSPACES_DIR, workspaceId, docId);
	}
	if (parts.length === 3) {
		const [workspaceId, slug, docId] = parts.map(safeSegment);
		if (!workspaceId || !slug || !docId) return null;
		return join(WORKSPACES_DIR, workspaceId, slug, docId);
	}
	const safe = safeSegment(roomId);
	if (!safe) return null;
	return join(EPHEMERALS_DIR, safe);
}

export function readRoomMeta(roomId: string): { createdAt: number; lastUpdatedAt: number } | null {
	const meta = readRoomMetaFull(roomId);
	return meta ? { createdAt: meta.createdAt, lastUpdatedAt: meta.lastUpdatedAt } : null;
}

export function readRoomMetaFull(roomId: string): RoomMetadata | null {
	return getWhiteboard(roomId);
}

/** List ephemeral room ids on disk (for TTL cleanup). */
export function listEphemeralIdsOnDisk(): string[] {
	try {
		if (!existsSync(EPHEMERALS_DIR)) return [];
		return readdirSync(EPHEMERALS_DIR, { withFileTypes: true })
			.filter((d) => d.isDirectory() && safeSegment(d.name) === d.name)
			.map((d) => d.name);
	} catch {
		return [];
	}
}

export function loadRoom(roomId: string): RoomDocument | null {
	const dir = roomIdToDocDir(roomId);
	if (!dir) return null;
	const scenePath = join(dir, SCENE_FILE);
	try {
		if (!existsSync(scenePath)) return null;
		const raw = readFileSync(scenePath, "utf-8");
		const doc = JSON.parse(raw) as RoomDocument;
		const fileMeta = getSvexMeta(doc);
		if (fileMeta) {
			setRoomMetadataFromLoad(roomId, roomMetadataFromSvexMeta(fileMeta));
		} else {
			const meta = getWhiteboard(roomId);
			if (meta) setRoomMetadataFromLoad(roomId, meta);
		}
		touchViewedAt(roomId);
		return doc;
	} catch {
		return null;
	}
}

/** Save room to disk. Ensures svexMeta in doc (file is source of truth); writes svexMeta first in JSON. Returns true if saved. */
export function saveRoom(roomId: string, doc: RoomDocument): boolean {
	const dir = roomIdToDocDir(roomId);
	if (!dir) return false;
	const now = Date.now();
	ensureSvexMetaForSave(doc, now, getRoomMetadata(roomId));
	const d = doc as Record<string, unknown>;
	const ordered =
		typeof d[SVEX_META_KEY] !== "undefined"
			? {
					[SVEX_META_KEY]: d[SVEX_META_KEY],
					...Object.fromEntries(Object.entries(d).filter(([k]) => k !== SVEX_META_KEY)),
				}
			: doc;
	const docStr = JSON.stringify(ordered);
	const docSize = Buffer.byteLength(docStr, "utf8");
	const config = getConfig().storage;
	const maxPerWhiteboard =
		roomIdToWorkspaceId(roomId) != null
			? config.maxSizePerWorkspaceWhiteboardBytes
			: config.maxSizePerEphemeralWhiteboardBytes;
	if (docSize > maxPerWhiteboard) return false;
	const workspaceId = roomIdToWorkspaceId(roomId);
	if (workspaceId) {
		const currentSize = getCurrentRoomSizeBytes(roomId);
		const workspaceTotal = getWorkspaceSizeBytes(workspaceId);
		const newTotal = workspaceTotal - currentSize + docSize;
		if (newTotal > config.maxWorkspaceBytes) return false;
	}
	try {
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, SCENE_FILE), docStr);
		return true;
	} catch {
		return false;
	}
}

export function deleteRoomFromDisk(roomId: string): void {
	const dir = roomIdToDocDir(roomId);
	if (!dir) return;
	try {
		rmSync(dir, { recursive: true, force: true });
		deleteWhiteboard(roomId);
	} catch {
		// ignore
	}
}

/** Persist callback: only persist workspace and ephemeral (not local); touch TTL and save. */
export function createPersistCallback(): (roomId: string, doc: RoomDocument) => void {
	return (roomId: string, doc: RoomDocument) => {
		if (roomId.startsWith("remote-")) return;
		const meta = getRoomMetadata(roomId);
		if (!meta) return;
		if (saveRoom(roomId, doc)) touchRoom(roomId);
	};
}
