import { fail, redirect } from "@sveltejs/kit";
import { getSessionId } from "$lib/server/auth/session-cookie.js";
import { getSession } from "$lib/server/auth/session-store.js";
import {
	getAccountBySessionId,
	getSessionsForAccount,
	changePassword,
	revokeSessionForAccount,
	createAccount,
	bindSessionToAccount,
} from "$lib/server/auth/account.js";

export function load({ cookies }) {
	const sid = getSessionId(cookies);
	if (!sid) throw redirect(302, "/account/login");
	const session = getSession(sid);
	const account = getAccountBySessionId(sid);
	// Admin who just used bootstrap link may have no account yet; require setup.
	if (!account && session.userKind !== "admin") throw redirect(302, "/account/login");
	const sessions = account ? getSessionsForAccount(account.id) : [];
	return {
		account: account ? { id: account.id, username: account.username, role: account.role } : null,
		requireSetup: !account && session.userKind === "admin",
		sessions: sessions.map((s) => ({
			sessionId: s.sessionId,
			lastPresenceAt: s.lastPresenceAt,
			current: s.sessionId === sid,
		})),
	};
}

export const actions = {
	setupAdmin: async ({ request, cookies }) => {
		const sid = getSessionId(cookies);
		if (!sid) throw redirect(302, "/account/login");
		const session = getSession(sid);
		if (session.userKind !== "admin") throw redirect(302, "/account/login");
		if (getAccountBySessionId(sid)) throw redirect(302, "/account/security");

		const fd = await request.formData();
		const username = fd.get("username");
		const password = fd.get("password");
		if (typeof username !== "string" || typeof password !== "string") {
			return fail(400, { error: "Username and password required" });
		}
		const result = await createAccount(username.trim(), password, "admin");
		if ("error" in result) return fail(400, { error: result.error });
		bindSessionToAccount(sid, result.account.id);
		throw redirect(302, "/account/security");
	},
	changePassword: async ({ request, cookies }) => {
		const sid = getSessionId(cookies);
		if (!sid) throw redirect(302, "/account/login");
		const account = getAccountBySessionId(sid);
		if (!account) throw redirect(302, "/account/login");

		const fd = await request.formData();
		const current = fd.get("currentPassword");
		const newPass = fd.get("newPassword");
		if (typeof current !== "string" || typeof newPass !== "string") {
			return fail(400, { error: "Current and new password required" });
		}
		const result = await changePassword(account.id, current, newPass);
		if ("error" in result) return fail(400, { error: result.error });
		return { success: true, message: "Password updated." };
	},
	revokeSession: async ({ request, cookies }) => {
		const sid = getSessionId(cookies);
		if (!sid) throw redirect(302, "/account/login");
		const account = getAccountBySessionId(sid);
		if (!account) throw redirect(302, "/account/login");

		const fd = await request.formData();
		const targetSid = fd.get("sessionId");
		if (typeof targetSid !== "string" || !targetSid.trim()) {
			return fail(400, { error: "Session id required" });
		}
		if (targetSid === sid) {
			return fail(400, { error: "Cannot revoke your current session" });
		}
		const ok = revokeSessionForAccount(account.id, targetSid.trim());
		if (!ok) return fail(400, { error: "Session not found or not yours" });
		return { success: true, message: "Session revoked." };
	},
};
