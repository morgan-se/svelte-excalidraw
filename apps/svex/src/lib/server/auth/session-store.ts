/**
 * Server-only: one JSON per user session (keyed by session cookie). In-memory + disk under data/sessions.
 *
 * Session file (authoritative):
 *   userKind, username, color, createdAt, lastPresenceAt,
 *   workspaceIds, ephemeralRooms, workspaceGrants, ephemeralGrants.
 * Only the server writes these; the client never sends full lists. On read we always re-load from disk
 * when the file exists so edits to the file are reflected on F5.
 */
import type { SessionData, SessionPatch } from "$lib/core/types/session-types.js";
import { getConfig, getSessionCaps } from "$lib/server/config.js";
import { loadSessionFromDisk, saveSessionToDisk } from "./session-storage.js";

const store = new Map<string, SessionData>();

function empty(): SessionData {
	const now = Date.now();
	return {
		userKind: "guest",
		createdAt: now,
		lastPresenceAt: now,
		workspaceIds: [],
		ephemeralRooms: [],
		workspaceGrants: {},
		ephemeralGrants: {},
	};
}

/**
 * Get session. Disk is authoritative: we always re-read from the session file when it exists.
 * When the file is missing (e.g. user deleted data/), we do not use in-memory or any client
 * state — we create a fresh empty session. Only username & color can later be set from the
 * client via sessionUpdateProfile (mergeSession with profile fields only).
 */
export function getSession(sid: string): SessionData {
	const fromDisk = loadSessionFromDisk(sid);
	if (fromDisk != null) {
		store.set(sid, fromDisk);
		return fromDisk;
	}
	store.delete(sid);
	const data = empty();
	store.set(sid, data);
	saveSessionToDisk(sid, data);
	return data;
}

export function setSession(sid: string, data: SessionData): void {
	store.set(sid, data);
	saveSessionToDisk(sid, data);
}

/** Remove session from in-memory store (after DB cleanup). */
export function deleteSessionFromStore(sid: string): void {
	store.delete(sid);
}

function getCaps(current: SessionData): { maxWorkspaces: number; maxEphemeral: number } {
	const config = getConfig();
	return getSessionCaps(config, current.userKind);
}

export function mergeSession(sid: string, partial: Partial<SessionData>): SessionData {
	const current = getSession(sid);
	const next: SessionData = {
		userKind: partial.userKind ?? current.userKind,
		username: partial.username !== undefined ? partial.username : current.username,
		color: partial.color !== undefined ? partial.color : current.color,
		createdAt: partial.createdAt ?? current.createdAt,
		lastPresenceAt: partial.lastPresenceAt ?? current.lastPresenceAt,
		workspaceIds: partial.workspaceIds ?? current.workspaceIds,
		ephemeralRooms: partial.ephemeralRooms ?? current.ephemeralRooms,
		workspaceGrants: partial.workspaceGrants ?? current.workspaceGrants,
		ephemeralGrants: partial.ephemeralGrants ?? current.ephemeralGrants,
		whiteboardGrants: partial.whiteboardGrants ?? current.whiteboardGrants,
	};
	store.set(sid, next);
	saveSessionToDisk(sid, next);
	return next;
}

function applyPatch(current: SessionData, patch: SessionPatch): SessionData {
	const now = Date.now();
	const caps = getCaps(current);
	let workspaceIds = current.workspaceIds ?? [];
	if (patch.addWorkspace) {
		const id = patch.addWorkspace;
		workspaceIds = [id, ...workspaceIds.filter((x) => x !== id)].slice(0, caps.maxWorkspaces);
	}
	if (patch.addWorkspaceGrant && !workspaceIds.includes(patch.addWorkspaceGrant.workspaceId)) {
		const id = patch.addWorkspaceGrant.workspaceId;
		workspaceIds = [id, ...workspaceIds.filter((x) => x !== id)].slice(0, caps.maxWorkspaces);
	}
	if (patch.removeWorkspaceGrant) {
		workspaceIds = workspaceIds.filter((x) => x !== patch.removeWorkspaceGrant);
	}
	let ephemeralRooms = current.ephemeralRooms ?? [];
	if (patch.addEphemeral) {
		const { id, lastUpdatedAt } = patch.addEphemeral;
		ephemeralRooms = [{ id, lastUpdatedAt }, ...ephemeralRooms.filter((x) => x.id !== id)].slice(0, caps.maxEphemeral);
	}
	if (patch.removeEphemeral) {
		ephemeralRooms = ephemeralRooms.filter((x) => x.id !== patch.removeEphemeral);
	}
	let workspaceGrants = { ...(current.workspaceGrants ?? {}) };
	if (patch.removeWorkspaceGrant) {
		delete workspaceGrants[patch.removeWorkspaceGrant];
	}
	if (patch.addWorkspaceGrant) {
		workspaceGrants[patch.addWorkspaceGrant.workspaceId] = patch.addWorkspaceGrant.access;
		const keys = Object.keys(workspaceGrants);
		if (keys.length > caps.maxWorkspaces) {
			const preferred = patch.addWorkspaceGrant.workspaceId;
			const rest = keys.filter((k) => k !== preferred).slice(0, caps.maxWorkspaces - 1);
			workspaceGrants = Object.fromEntries(
				[[preferred, workspaceGrants[preferred]!], ...rest.map((k) => [k, workspaceGrants[k]!] as const)],
			);
		}
	}
	let ephemeralGrants = { ...(current.ephemeralGrants ?? {}) };
	if (patch.removeEphemeralGrant) {
		delete ephemeralGrants[patch.removeEphemeralGrant];
	}
	if (patch.addEphemeralGrant) {
		ephemeralGrants[patch.addEphemeralGrant.id] = patch.addEphemeralGrant.access;
		const keys = Object.keys(ephemeralGrants);
		if (keys.length > caps.maxEphemeral) {
			const preferred = patch.addEphemeralGrant.id;
			const rest = keys.filter((k) => k !== preferred).slice(0, caps.maxEphemeral - 1);
			ephemeralGrants = Object.fromEntries(
				[[preferred, ephemeralGrants[preferred]!], ...rest.map((k) => [k, ephemeralGrants[k]!] as const)],
			);
		}
	}
	let whiteboardGrants = { ...(current.whiteboardGrants ?? {}) };
	if (patch.removeWhiteboardGrant) {
		delete whiteboardGrants[patch.removeWhiteboardGrant];
	}
	if (patch.addWhiteboardGrant) {
		whiteboardGrants[patch.addWhiteboardGrant.roomId] = patch.addWhiteboardGrant.access;
	}
	return {
		userKind: patch.userKind ?? current.userKind,
		username: patch.username !== undefined ? patch.username : current.username,
		color: patch.color !== undefined ? patch.color : current.color,
		createdAt: current.createdAt,
		lastPresenceAt: patch.touchPresence ? now : current.lastPresenceAt,
		workspaceIds,
		ephemeralRooms,
		workspaceGrants: Object.keys(workspaceGrants).length ? workspaceGrants : undefined,
		ephemeralGrants: Object.keys(ephemeralGrants).length ? ephemeralGrants : undefined,
		whiteboardGrants: Object.keys(whiteboardGrants).length ? whiteboardGrants : undefined,
	};
}

export function patchSession(sid: string, patch: SessionPatch): SessionData {
	const current = getSession(sid);
	const next = applyPatch(current, patch);
	store.set(sid, next);
	saveSessionToDisk(sid, next);
	return next;
}
