/**
 * Single session payload (server: one JSON per user session).
 * Authless users; userKind supports future authz (guest → trusted → admin).
 */

export type UserKind = "guest" | "trusted" | "admin";

export interface EphemeralRoom {
	id: string;
	lastUpdatedAt?: number;
}

export type GrantAccess = "read" | "readWrite";

export interface SessionData {
	userKind: UserKind;
	username?: string;
	color?: string;
	/** When the session was created (for TTL/cleanup). */
	createdAt?: number;
	/** Last time the user was present (for TTL/cleanup). */
	lastPresenceAt?: number;
	/** Persistent workspaces (slug ids) for "continue" on landing; cloned with login link. */
	workspaceIds?: string[];
	/** Ephemeral room ids + TTL for "continue" on landing; cloned with login link. */
	ephemeralRooms?: EphemeralRoom[];
	/** Grants for workspace access (read or readWrite). Enforced in load and stream. */
	workspaceGrants?: Record<string, GrantAccess>;
	/** Grants for ephemeral room access (read or readWrite). Enforced in load and stream. */
	ephemeralGrants?: Record<string, GrantAccess>;
	/** Grants for specific whiteboard access (workspace whiteboard by roomId). Enforced in load and stream. */
	whiteboardGrants?: Record<string, GrantAccess>;
}

/** Granular updates for session. */
export interface SessionPatch {
	userKind?: UserKind;
	username?: string;
	color?: string;
	touchPresence?: true;
	addWorkspace?: string;
	addEphemeral?: EphemeralRoom;
	removeEphemeral?: string;
	removeWorkspaceGrant?: string;
	removeEphemeralGrant?: string;
	addWorkspaceGrant?: { workspaceId: string; access: GrantAccess };
	addEphemeralGrant?: { id: string; access: GrantAccess };
	addWhiteboardGrant?: { roomId: string; access: GrantAccess };
	removeWhiteboardGrant?: string;
}
