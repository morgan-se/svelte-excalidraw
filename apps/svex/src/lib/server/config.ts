/**
 * Server config: parse SVEX_CONFIG_JSON (all optional) and merge with DEFAULT_CONFIG.
 * Output is always full SvexConfig. Validated with Valibot.
 */

import * as v from "valibot";
import { DEFAULT_CONFIG, canCreate, resolveLimit, type ConfigFlags, type SvexConfig } from "$lib/config.js";
import type { SessionData } from "$lib/core/types/session-types.js";

// --- Schema: input all optional, defaults from DEFAULT_CONFIG, output full ---

export const userKindSchema = v.union([
	v.literal("guest"),
	v.literal("trusted"),
	v.literal("admin"),
]);

const recordUserKindNumberSchema = v.object({
	guest: v.optional(v.number()),
	trusted: v.optional(v.number()),
	admin: v.optional(v.number()),
});

const localSchema = v.object({
	enabled: v.optional(v.boolean(), DEFAULT_CONFIG.local.enabled),
});

const ephemeralSchema = v.object({
	enabled: v.optional(v.boolean(), DEFAULT_CONFIG.ephemeral.enabled),
	ttlHours: v.optional(v.number(), DEFAULT_CONFIG.ephemeral.ttlHours),
	createAllowedFor: v.optional(userKindSchema, DEFAULT_CONFIG.ephemeral.createAllowedFor),
	maxEphemeral: v.optional(
		v.union([v.number(), recordUserKindNumberSchema]),
		DEFAULT_CONFIG.ephemeral.maxEphemeral,
	),
});

const workspaceSchema = v.object({
	enabled: v.optional(v.boolean(), DEFAULT_CONFIG.workspace.enabled),
	createAllowedFor: v.optional(userKindSchema, DEFAULT_CONFIG.workspace.createAllowedFor),
	maxCollections: v.optional(
		v.union([v.number(), recordUserKindNumberSchema]),
		DEFAULT_CONFIG.workspace.maxCollections,
	),
	maxWhiteboards: v.optional(
		v.union([v.number(), recordUserKindNumberSchema]),
		DEFAULT_CONFIG.workspace.maxWhiteboards,
	),
	maxWorkspaces: v.optional(
		v.union([v.number(), recordUserKindNumberSchema]),
		DEFAULT_CONFIG.workspace.maxWorkspaces,
	),
	selfHostedHint: v.optional(v.boolean(), DEFAULT_CONFIG.workspace.selfHostedHint ?? false),
});

const sessionConfigSchema = v.object({
	ttlDays: v.optional(v.number(), DEFAULT_CONFIG.session.ttlDays),
	emptySessionRetentionDays: v.optional(
		v.number(),
		DEFAULT_CONFIG.session.emptySessionRetentionDays,
	),
});

const storageConfigSchema = v.object({
	maxSizePerEphemeralWhiteboardBytes: v.optional(
		v.number(),
		DEFAULT_CONFIG.storage.maxSizePerEphemeralWhiteboardBytes,
	),
	maxSizePerWorkspaceWhiteboardBytes: v.optional(
		v.number(),
		DEFAULT_CONFIG.storage.maxSizePerWorkspaceWhiteboardBytes,
	),
	maxWorkspaceBytes: v.optional(v.number(), DEFAULT_CONFIG.storage.maxWorkspaceBytes),
	cleanupIntervalMinutes: v.optional(
		v.number(),
		DEFAULT_CONFIG.storage.cleanupIntervalMinutes,
	),
});

const svexConfigSchema = v.object({
	local: v.optional(localSchema, { ...DEFAULT_CONFIG.local }),
	ephemeral: v.optional(ephemeralSchema, { ...DEFAULT_CONFIG.ephemeral }),
	workspace: v.optional(workspaceSchema, { ...DEFAULT_CONFIG.workspace }),
	session: v.optional(sessionConfigSchema, { ...DEFAULT_CONFIG.session }),
	storage: v.optional(storageConfigSchema, { ...DEFAULT_CONFIG.storage }),
});

function getEnvJson(): unknown {
	if (typeof process === "undefined" || !process.env?.SVEX_CONFIG_JSON) return {};
	try {
		return JSON.parse(process.env.SVEX_CONFIG_JSON) as unknown;
	} catch {
		return {};
	}
}

let cached: SvexConfig | null = null;

/** Full config. Input (env) is optional; defaults applied; output always complete. */
export function getConfig(): SvexConfig {
	if (cached) return cached;
	const raw = getEnvJson();
	const result = v.safeParse(svexConfigSchema, raw);
	cached = (result.success ? result.output : v.parse(svexConfigSchema, {})) as SvexConfig;
	return cached;
}

/** Resolve maxEphemeral and maxWorkspaces for a user from config. */
export function getSessionCaps(config: SvexConfig, userKind: SessionData["userKind"]): {
	maxEphemeral: number;
	maxWorkspaces: number;
} {
	return {
		maxEphemeral: resolveLimit(config.ephemeral.maxEphemeral, userKind, 5),
		maxWorkspaces: resolveLimit(config.workspace.maxWorkspaces, userKind, 3),
	};
}

/** Minimal flags for the client. Only what the UI needs; never send full config. */
export function getClientFlags(config: SvexConfig, session: SessionData | null): ConfigFlags {
	const userKind = session?.userKind ?? "guest";
	const canCreateEphemeral =
		config.ephemeral.enabled && canCreate(userKind, config.ephemeral.createAllowedFor);
	const canCreateWorkspace =
		config.workspace.enabled && canCreate(userKind, config.workspace.createAllowedFor);
	return {
		localEnabled: config.local.enabled,
		ephemeralEnabled: config.ephemeral.enabled,
		workspaceEnabled: config.workspace.enabled,
		ephemeralTtlHours: config.ephemeral.ttlHours,
		canCreateEphemeral,
		canCreateWorkspace,
		workspaceSelfHostedHint: config.workspace.selfHostedHint && !canCreateWorkspace,
	};
}
