import { requireAdmin } from "$lib/server/auth/admin-guard.js";

export function load({ cookies }) {
	requireAdmin(cookies);
	return {};
}
