import { redirect } from "@sveltejs/kit";
import { getSessionId } from "$lib/server/auth/session-cookie.js";
import { getAccountBySessionId } from "$lib/server/auth/account.js";

export function load({ cookies }) {
	const sid = getSessionId(cookies);
	const account = sid ? getAccountBySessionId(sid) : null;
	if (!account) throw redirect(302, "/account/login");
	return { account: { username: account.username, role: account.role } };
}
