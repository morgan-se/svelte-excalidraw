import { getSessionId } from "$lib/server/auth/session-cookie.js";
import { getSession } from "$lib/server/auth/session-store.js";
import { getAccountBySessionId } from "$lib/server/auth/account.js";

export function load({ cookies }) {
	const sid = getSessionId(cookies);
	if (!sid) {
		return { session: null, account: null };
	}
	const session = getSession(sid);
	const account = getAccountBySessionId(sid);
	return {
		session: { userKind: session.userKind, username: session.username },
		account: account ? { id: account.id, username: account.username, role: account.role } : null,
	};
}
