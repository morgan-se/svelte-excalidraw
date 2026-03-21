/**
 * Server-only: admin data and actions. All require admin session (caller enforces).
 */
import { getDb, setShareLinksDisabled as setShareLinksDisabledDb } from "../storage/db.js";
import { getRecentSecurityEvents, getSecurityCounters, logSecurityEvent } from "../auth/security-events.js";
import { deleteSessionFromDb } from "../auth/session-storage.js";
import { deleteSessionFromStore } from "../auth/session-store.js";
import { createBootstrapAdminCode } from "../auth/upgrade-code.js";
import { runLifecycleCleanup } from "../lifecycle-cleanup.js";
import { deleteRoomData } from "svelte-excalidraw/server/state";
import { deleteRoomFromDisk } from "../storage/room-storage.js";

function redactIp(ip: string | null): string {
	if (!ip || ip === "unknown") return "—";
	if (ip.includes(".")) {
		const parts = ip.split(".");
		if (parts.length === 4) parts[3] = "0";
		return parts.join(".");
	}
	if (ip.includes(":")) return ip.slice(0, 20) + "…";
	return "—";
}

function fingerprintPrefix(fp: string | null): string {
	if (!fp || fp.length < 8) return "—";
	return fp.slice(0, 8) + "…";
}

const MS_24H = 24 * 60 * 60 * 1000;

export interface OverviewStats {
	sessionCounts: { guest: number; trusted: number; admin: number };
	whiteboardCount: number;
	ephemeralCount: number;
	workspaceCount: number;
	counts: Record<string, number>;
	/** Counts in last 24h (from event buffer). */
	countsLast24h: Record<string, number>;
	/** Top failure types in last 24h: type -> count (failure or rate_limited only). */
	topFailures: { type: string; count: number }[];
}

export function getOverviewStats(): OverviewStats {
	const db = getDb();
	const sessionRows = db
		.prepare(
			"SELECT user_kind, COUNT(*) as c FROM sessions GROUP BY user_kind",
		)
		.all() as { user_kind: string; c: number }[];
	const sessionCounts = { guest: 0, trusted: 0, admin: 0 };
	for (const r of sessionRows) {
		if (r.user_kind === "admin") sessionCounts.admin = r.c;
		else if (r.user_kind === "trusted") sessionCounts.trusted = r.c;
		else sessionCounts.guest = r.c;
	}
	const whiteboardRow = db.prepare("SELECT COUNT(*) as c FROM whiteboards WHERE workspace_id IS NOT NULL").get() as { c: number };
	const ephemeralRow = db.prepare("SELECT COUNT(*) as c FROM whiteboards WHERE workspace_id IS NULL").get() as { c: number };
	const workspaceRow = db.prepare("SELECT COUNT(*) as c FROM workspaces WHERE is_remote = 0").get() as { c: number };
	const counts = getSecurityCounters();
	const events = getRecentSecurityEvents(MAX_RECENT_EVENTS);
	const cutoff = Date.now() - MS_24H;
	const last24h = events.filter((e) => e.timestamp >= cutoff);
	const countsLast24h: Record<string, number> = {};
	for (const e of last24h) {
		countsLast24h[e.type] = (countsLast24h[e.type] ?? 0) + 1;
	}
	const failureTypes: Record<string, number> = {};
	for (const e of last24h) {
		if (e.outcome === "failure" || e.outcome === "rate_limited") {
			failureTypes[e.type] = (failureTypes[e.type] ?? 0) + 1;
		}
	}
	const topFailures = Object.entries(failureTypes)
		.map(([type, count]) => ({ type, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 10);
	return {
		sessionCounts,
		whiteboardCount: whiteboardRow?.c ?? 0,
		ephemeralCount: ephemeralRow?.c ?? 0,
		workspaceCount: workspaceRow?.c ?? 0,
		counts: counts as unknown as Record<string, number>,
		countsLast24h,
		topFailures,
	};
}

const MAX_RECENT_EVENTS = 2000;

export type { SecurityEvent } from "../auth/security-events.js";

export function getSecurityEvents(limit = 200) {
	return getRecentSecurityEvents(limit);
}

/** Group event counts by route and outcome (for Security page). */
export function getSecurityCountsByRouteOutcome(): { route: string; outcome: string; count: number }[] {
	const events = getRecentSecurityEvents(MAX_RECENT_EVENTS);
	const map = new Map<string, number>();
	for (const e of events) {
		const key = `${e.route ?? "—"}\t${e.outcome}`;
		map.set(key, (map.get(key) ?? 0) + 1);
	}
	return Array.from(map.entries())
		.map(([key, count]) => {
			const [route, outcome] = key.split("\t");
			return { route, outcome, count };
		})
		.sort((a, b) => b.count - a.count);
}

export interface SessionRow {
	id: string;
	userKind: string;
	username: string | null;
	lastPresenceAt: number | null;
	ipRedacted: string;
	fingerprintPrefix: string;
}

/** Session counts by userKind (for Sessions page header). */
export function getSessionCounts(): { guest: number; trusted: number; admin: number } {
	const db = getDb();
	const rows = db
		.prepare("SELECT user_kind, COUNT(*) as c FROM sessions GROUP BY user_kind")
		.all() as { user_kind: string; c: number }[];
	const out = { guest: 0, trusted: 0, admin: 0 };
	for (const r of rows) {
		if (r.user_kind === "admin") out.admin = r.c;
		else if (r.user_kind === "trusted") out.trusted = r.c;
		else out.guest = r.c;
	}
	return out;
}

export function getSessions(limit = 100): SessionRow[] {
	const db = getDb();
	const rows = db
		.prepare(
			"SELECT id, user_kind, username, last_presence_at, ip, fingerprint FROM sessions ORDER BY last_presence_at DESC LIMIT ?",
		)
		.all(limit) as { id: string; user_kind: string; username: string | null; last_presence_at: number | null; ip: string | null; fingerprint: string | null }[];
	return rows.map((r) => ({
		id: r.id,
		userKind: r.user_kind,
		username: r.username,
		lastPresenceAt: r.last_presence_at,
		ipRedacted: redactIp(r.ip),
		fingerprintPrefix: fingerprintPrefix(r.fingerprint),
	}));
}

export function invalidateSession(sid: string): void {
	deleteSessionFromDb(sid);
	deleteSessionFromStore(sid);
	logSecurityEvent(
		{ type: "admin_session_invalidated", route: "admin/sessions", outcome: "success" },
		undefined,
	);
}

const STALE_ARTIFACT_DAYS = 90;

export interface WorkspaceRow {
	id: string;
	name: string | null;
	whiteboardCount: number;
	updatedAt: number;
	shareLinksDisabled: boolean;
}

export function getWorkspaces(): WorkspaceRow[] {
	const db = getDb();
	const rows = db
		.prepare(
			`SELECT w.id, w.name, w.updated_at, COALESCE(w.share_links_disabled, 0) as share_links_disabled,
        (SELECT COUNT(*) FROM whiteboards b WHERE b.workspace_id = w.id) as whiteboard_count
       FROM workspaces w WHERE w.is_remote = 0 ORDER BY w.updated_at DESC`,
		)
		.all() as { id: string; name: string | null; updated_at: number; share_links_disabled: number; whiteboard_count: number }[];
	return rows.map((r) => ({
		id: r.id,
		name: r.name,
		whiteboardCount: r.whiteboard_count,
		updatedAt: r.updated_at,
		shareLinksDisabled: r.share_links_disabled === 1,
	}));
}

export function revokeShareTokensForWorkspace(workspaceId: string): number {
	const db = getDb();
	const result = db.prepare("DELETE FROM share_tokens WHERE workspace_id = ?").run(workspaceId);
	logSecurityEvent(
		{ type: "admin_share_revoked", route: "admin/workspaces", outcome: "success" },
		undefined,
	);
	return result.changes;
}

/** Disable or enable share links for a workspace. If disabling, revokes existing share tokens. */
export function setShareLinksDisabledForWorkspace(workspaceId: string, disabled: boolean): void {
	setShareLinksDisabledDb(workspaceId, disabled);
	if (disabled) {
		revokeShareTokensForWorkspace(workspaceId);
	}
}

/** Delete whiteboards in this workspace not updated in the last STALE_ARTIFACT_DAYS days; returns count deleted. */
export function cleanupStaleArtifactsForWorkspace(workspaceId: string): number {
	const db = getDb();
	const cutoff = Date.now() - STALE_ARTIFACT_DAYS * 24 * 60 * 60 * 1000;
	const rows = db
		.prepare("SELECT id FROM whiteboards WHERE workspace_id = ? AND updated_at < ?")
		.all(workspaceId, cutoff) as { id: string }[];
	for (const r of rows) {
		deleteRoomData(r.id);
		deleteRoomFromDisk(r.id);
	}
	return rows.length;
}

export function runCleanup(): void {
	runLifecycleCleanup();
	logSecurityEvent(
		{ type: "admin_cleanup", route: "admin", outcome: "success" },
		undefined,
	);
}

const BOOTSTRAP_TTL_MS = 10 * 60 * 1000; // 10 min

export function createBootstrapLink(origin: string): { url: string; expiresAt: number } {
	const { code, expiresAt } = createBootstrapAdminCode(BOOTSTRAP_TTL_MS);
	logSecurityEvent(
		{ type: "admin_bootstrap_link", route: "admin/bootstrap", outcome: "success" },
		undefined,
	);
	return { url: `${origin}/upgrade/${code}`, expiresAt };
}

/** Revoke all outstanding upgrade tokens (safe action from plan 8.3). */
export function revokeAllUpgradeTokens(): number {
	const db = getDb();
	const result = db.prepare("DELETE FROM upgrade_tokens").run();
	logSecurityEvent(
		{ type: "admin_revoke_upgrade_tokens", route: "admin/security", outcome: "success" },
		undefined,
	);
	return result.changes;
}

/** Revoke all outstanding share tokens (safe action from plan 8.3). */
export function revokeAllShareTokens(): number {
	const db = getDb();
	const result = db.prepare("DELETE FROM share_tokens").run();
	logSecurityEvent(
		{ type: "admin_revoke_share_tokens", route: "admin/security", outcome: "success" },
		undefined,
	);
	return result.changes;
}
