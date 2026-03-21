import { requireAdmin } from "$lib/server/auth/admin-guard.js";
import { getOverviewStats } from "$lib/server/admin/data.js";

export function load({ cookies }) {
	requireAdmin(cookies);
	return { stats: getOverviewStats() };
}
