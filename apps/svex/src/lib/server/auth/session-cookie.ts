/**
 * Session cookie handling (server-only). Used by layout load and API.
 */
import { getConfig } from "$lib/server/config.js";
import { getSession, mergeSession, patchSession } from "./session-store.js";
import type { SessionData } from "$lib/core/types/session-types.js";

export const SESSION_COOKIE = "svex_sid";

/** Cookie options derived from session.ttlDays. */
export function getSessionCookieOptions(): { path: string; httpOnly: boolean; sameSite: "lax"; secure: boolean; maxAge: number } {
	const ttlDays = getConfig().session.ttlDays;
	return {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		maxAge: ttlDays * 24 * 60 * 60, // seconds
	};
}

export function getSessionId(cookies: { get: (n: string) => string | undefined }): string | undefined {
	return cookies.get(SESSION_COOKIE) ?? undefined;
}

export function getOrCreateSessionId(cookies: { get: (n: string) => string | undefined; set: (n: string, v: string, o: object) => void }): string {
	let sid = cookies.get(SESSION_COOKIE);
	if (sid) return sid;
	sid = crypto.randomUUID();
	cookies.set(SESSION_COOKIE, sid, getSessionCookieOptions());
	return sid;
}

export function getSessionData(cookies: { get: (n: string) => string | undefined; set: (n: string, v: string, o: object) => void }): SessionData {
	const sid = getOrCreateSessionId(cookies);
	getSession(sid); // ensure session exists
	// Touch last presence on every request that loads session (for TTL/cleanup).
	return patchSession(sid, { touchPresence: true });
}

/** Only profile (username, color) is accepted from the client. Never pass workspaceIds/ephemeralRooms/grants. */
export function updateSession(
	cookies: { get: (n: string) => string | undefined; set: (n: string, v: string, o: object) => void },
	partial: { username?: string; color?: string },
): SessionData {
	const sid = getOrCreateSessionId(cookies);
	return mergeSession(sid, partial);
}
