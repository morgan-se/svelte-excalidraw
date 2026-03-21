import { redirect } from "@sveltejs/kit";
import { claimLoginToken } from "$lib/server/auth/login-token.js";
import { SESSION_COOKIE, getSessionCookieOptions } from "$lib/server/auth/session-cookie.js";
import {
	checkRateLimit,
	getLoginClaimLimit,
	isRateLimitEnabledForSensitiveRoutes,
} from "$lib/server/auth/rate-limit.js";
import { logSecurityEvent } from "$lib/server/auth/security-events.js";

export const prerender = false;

export async function GET({ params, cookies, getClientAddress }) {
	const clientAddress = getClientAddress();
	if (isRateLimitEnabledForSensitiveRoutes()) {
		const allowed = checkRateLimit(`login_claim:${clientAddress}`, getLoginClaimLimit());
		if (!allowed) {
			logSecurityEvent(
				{ type: "login_claim_invalid", route: "/login/claim/[token]", outcome: "rate_limited" },
				clientAddress,
			);
			throw redirect(302, "/");
		}
	}
	const newSid = claimLoginToken(params.token);
	if (!newSid) {
		logSecurityEvent(
			{ type: "login_claim_invalid", route: "/login/claim/[token]", outcome: "failure" },
			clientAddress,
		);
		throw redirect(302, "/");
	}
	logSecurityEvent(
		{ type: "login_claim_consumed", route: "/login/claim/[token]", outcome: "success" },
		clientAddress,
	);
	cookies.set(SESSION_COOKIE, newSid, getSessionCookieOptions());
	throw redirect(302, "/");
}
