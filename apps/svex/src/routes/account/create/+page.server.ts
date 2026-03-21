import { fail, redirect } from "@sveltejs/kit";
import { getOrCreateSessionId } from "$lib/server/auth/session-cookie.js";
import { createAccount, bindSessionToAccount } from "$lib/server/auth/account.js";

export function load() {
	return {};
}

export const actions = {
	create: async ({ request, cookies }) => {
		const fd = await request.formData();
		const username = fd.get("username");
		const password = fd.get("password");
		if (typeof username !== "string" || typeof password !== "string") {
			return fail(400, { error: "Username and password required" });
		}
		const result = await createAccount(username.trim(), password, "trusted");
		if ("error" in result) {
			return fail(400, { error: result.error });
		}
		const sid = getOrCreateSessionId(cookies);
		bindSessionToAccount(sid, result.account.id);
		throw redirect(302, "/");
	},
};
