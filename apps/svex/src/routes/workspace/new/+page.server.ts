import { redirect } from "@sveltejs/kit";

export async function load({ parent }) {
	const { flags } = await parent();
	if (!flags.canCreateWorkspace) {
		redirect(303, "/");
	}
	return {};
}
