import { redirect } from "@sveltejs/kit";
import { SESSION_COOKIE } from "$lib/server/auth/session-cookie.js";
import { unbindSession } from "$lib/server/auth/account.js";
import { getSessionId } from "$lib/server/auth/session-cookie.js";

export const prerender = false;

export function GET({ cookies }) {
	const sid = getSessionId(cookies);
	if (sid) unbindSession(sid);
	cookies.delete(SESSION_COOKIE, { path: "/" });
	throw redirect(302, "/");
}
