import { redirect } from "@sveltejs/kit";
import { claimLoginToken } from "$lib/server/auth/login-token.js";
import { SESSION_COOKIE, getSessionCookieOptions } from "$lib/server/auth/session-cookie.js";

export const prerender = false;

export function GET({ params, cookies }) {
	const token = params.token;
	const newSid = claimLoginToken(token);
	if (!newSid) {
		throw redirect(302, "/");
	}
	cookies.set(SESSION_COOKIE, newSid, getSessionCookieOptions());
	throw redirect(302, "/");
}
