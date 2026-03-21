import { fail } from "@sveltejs/kit";
import { createBootstrapLink } from "$lib/server/admin/data.js";

export const actions = {
	create: async ({ request, url }) => {
		const origin = url.origin;
		const { url: bootstrapUrl, expiresAt } = createBootstrapLink(origin);
		return {
			success: true,
			url: bootstrapUrl,
			expiresAt,
		};
	},
};
