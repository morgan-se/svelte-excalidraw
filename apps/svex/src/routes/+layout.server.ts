import { getConfig, getClientFlags } from "$lib/server/config.js";
import { getSessionData } from "$lib/server/auth/session-cookie.js";

export function load({ cookies }) {
	const config = getConfig();
	const session = getSessionData(cookies);
	return { flags: getClientFlags(config, session), session };
}
