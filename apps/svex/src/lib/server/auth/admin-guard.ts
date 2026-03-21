/**
 * Server-only: require admin session for /admin routes. Redirect to / if not admin.
 */
import { redirect } from "@sveltejs/kit";
import type { SessionData } from "$lib/core/types/session-types.js";
import { getSessionData } from "./session-cookie.js";

export function requireAdmin(cookies: { get: (n: string) => string | undefined; set: (n: string, v: string, o: object) => void }): SessionData {
	const session = getSessionData(cookies);
	if (session?.userKind !== "admin") {
		throw redirect(302, "/");
	}
	return session;
}
