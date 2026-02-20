/**
 * Server-only: base data directory. We own it; no svex prefix.
 */
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export const DATA_DIR =
	typeof process !== "undefined" && process.env?.SVEX_DATA_DIR
		? process.env.SVEX_DATA_DIR
		: join(process.cwd(), "data");

if (typeof process !== "undefined" && !existsSync(DATA_DIR)) {
	mkdirSync(DATA_DIR, { recursive: true });
}

export const SESSIONS_DIR = join(DATA_DIR, "sessions");
export const UPGRADE_CODES_DIR = join(DATA_DIR, "upgrade-codes");
export const SHARE_TOKENS_DIR = join(DATA_DIR, "share-tokens");
export const WORKSPACES_DIR = join(DATA_DIR, "workspaces");
export const EPHEMERALS_DIR = join(DATA_DIR, "ephemerals");
