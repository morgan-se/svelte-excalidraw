import { fail } from "@sveltejs/kit";
import {
	getWorkspaces,
	revokeShareTokensForWorkspace,
	runCleanup,
	setShareLinksDisabledForWorkspace,
	cleanupStaleArtifactsForWorkspace,
} from "$lib/server/admin/data.js";

export function load() {
	return {
		workspaces: getWorkspaces(),
	};
}

export const actions = {
	revokeShareLinks: async ({ request }) => {
		const fd = await request.formData();
		const workspaceId = fd.get("workspaceId");
		if (typeof workspaceId !== "string" || !workspaceId.trim()) {
			return fail(400, { error: "Missing workspace id" });
		}
		const revoked = revokeShareTokensForWorkspace(workspaceId.trim());
		return { success: true, revoked };
	},
	setShareLinksPolicy: async ({ request }) => {
		const fd = await request.formData();
		const workspaceId = fd.get("workspaceId");
		const disabled = fd.get("disabled");
		if (typeof workspaceId !== "string" || !workspaceId.trim()) {
			return fail(400, { error: "Missing workspace id" });
		}
		setShareLinksDisabledForWorkspace(workspaceId.trim(), disabled === "true");
		return { success: true, policy: disabled === "true" ? "disabled" : "enabled" };
	},
	cleanupStale: async ({ request }) => {
		const fd = await request.formData();
		const workspaceId = fd.get("workspaceId");
		if (typeof workspaceId !== "string" || !workspaceId.trim()) {
			return fail(400, { error: "Missing workspace id" });
		}
		const deleted = cleanupStaleArtifactsForWorkspace(workspaceId.trim());
		return { success: true, deleted };
	},
	runCleanup: async () => {
		runCleanup();
		return { success: true, message: "Cleanup completed." };
	},
};
