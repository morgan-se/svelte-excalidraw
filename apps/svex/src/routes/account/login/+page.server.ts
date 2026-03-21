import { fail, redirect } from "@sveltejs/kit";
import { SESSION_COOKIE, getSessionCookieOptions } from "$lib/server/auth/session-cookie.js";
import { loginWithPassword } from "$lib/server/auth/account.js";

export function load() {
	return {};
}

export const actions = {
	login: async ({ request, cookies }) => {
		const fd = await request.formData();
		const username = fd.get("username");
		const password = fd.get("password");
		if (typeof username !== "string" || typeof password !== "string") {
			return fail(400, { error: "Username and password required" });
		}
		const result = await loginWithPassword(username.trim(), password);
		if ("error" in result) {
			return fail(401, { error: result.error });
		}
		cookies.set(SESSION_COOKIE, result.sid, getSessionCookieOptions());
		throw redirect(302, "/");
	},
};
