import { fail } from "@sveltejs/kit";
import { getSessions, getSessionCounts, invalidateSession } from "$lib/server/admin/data.js";

export function load() {
	return {
		sessions: getSessions(100),
		sessionCounts: getSessionCounts(),
	};
}

export const actions = {
	invalidate: async ({ request }) => {
		const fd = await request.formData();
		const sid = fd.get("sid");
		if (typeof sid !== "string" || !sid.trim()) {
			return fail(400, { error: "Missing session id" });
		}
		invalidateSession(sid.trim());
		return { success: true };
	},
};
