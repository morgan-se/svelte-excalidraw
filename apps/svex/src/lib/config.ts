/**
 * Config types and default values. Single source for the app.
 * Server parses env (all optional) and merges with DEFAULT_CONFIG; output is always full.
 */

export type UserKind = "guest" | "trusted" | "admin";

/** Minimum level required to create. guest < trusted < admin. */
const USER_LEVEL: Record<UserKind, number> = { guest: 0, trusted: 1, admin: 2 };
export function canCreate(userKind: UserKind, minLevel: UserKind): boolean {
	return USER_LEVEL[userKind] >= USER_LEVEL[minLevel];
}

/** Resolve number | Record<UserKind, number> to number for a user. */
export function resolveLimit(
	n: number | Record<UserKind, number> | undefined,
	userKind: UserKind,
	fallback: number,
): number {
	if (n == null) return fallback;
	if (typeof n === "number") return n;
	return n[userKind] ?? n.guest ?? n.trusted ?? n.admin ?? fallback;
}

export interface LocalConfig {
	enabled: boolean;
}

export interface EphemeralConfig {
	enabled: boolean;
	ttlHours: number;
	/** Minimum user level to create ephemeral rooms. */
	createAllowedFor: UserKind;
	maxEphemeral: number | Record<UserKind, number>;
}

export interface WorkspaceConfig {
	enabled: boolean;
	/** Minimum user level to create workspaces. */
	createAllowedFor: UserKind;
	maxCollections: number | Record<UserKind, number>;
	maxWhiteboards: number | Record<UserKind, number>;
	maxWorkspaces: number | Record<UserKind, number>;
	/** When true, show guests a hint: self-host or plus.excalidraw.com (URLs fixed). */
	selfHostedHint?: boolean;
}

export interface SessionConfig {
	ttlDays: number;
	emptySessionRetentionDays: number;
}

export interface StorageConfig {
	/** Max size per whiteboard for ephemeral rooms. */
	maxSizePerEphemeralWhiteboardBytes: number;
	/** Max size per whiteboard for workspace rooms (local or remote). */
	maxSizePerWorkspaceWhiteboardBytes: number;
	maxWorkspaceBytes: number;
	/** How often to run lifecycle cleanup (sessions, ephemeral rooms, orphaned workspaces). */
	cleanupIntervalMinutes: number;
}

export interface SvexConfig {
	local: LocalConfig;
	ephemeral: EphemeralConfig;
	workspace: WorkspaceConfig;
	session: SessionConfig;
	storage: StorageConfig;
}

/** Minimal flags sent to the client only. Not the full config. */
export interface ConfigFlags {
	localEnabled: boolean;
	ephemeralEnabled: boolean;
	workspaceEnabled: boolean;
	ephemeralTtlHours: number;
	canCreateEphemeral: boolean;
	canCreateWorkspace: boolean;
	/** When guest can't create workspace and selfHostedHint is on: show hint. */
	workspaceSelfHostedHint?: boolean;
}

/** Single source of default values. Server uses this for parsing. */
export const DEFAULT_CONFIG: SvexConfig = {
	local: { enabled: true },
	ephemeral: {
		enabled: true,
		ttlHours: 48,
		createAllowedFor: "guest",
		maxEphemeral: 5,
	},
	workspace: {
		enabled: true,
		createAllowedFor: "trusted",
		maxCollections: 5,
		maxWhiteboards: 50,
		maxWorkspaces: 3,
		selfHostedHint: true, // svex.tips.dev: show guests self-host / plus.excalidraw.com hint
	},
	session: {
		ttlDays: 30,
		emptySessionRetentionDays: 7,
	},
	storage: {
		maxSizePerEphemeralWhiteboardBytes: 5 * 1024 * 1024,
		maxSizePerWorkspaceWhiteboardBytes: 20 * 1024 * 1024,
		maxWorkspaceBytes: 100 * 1024 * 1024,
		cleanupIntervalMinutes: 15,
	},
};
