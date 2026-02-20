import { redirect } from "@sveltejs/kit";
import { getOrCreateSessionId } from "$lib/server/auth/session-cookie.js";
import { getSession, patchSession } from "$lib/server/auth/session-store.js";
import { getWorkspaceWhiteboards, getWorkspaceCollections } from "$lib/server/storage/workspace-store.js";
import { readRoomMeta, readRoomMetaFull } from "$lib/server/storage/room-storage.js";

export function load({
	params,
	cookies,
}: {
	params: { workspaceId: string };
	cookies: { get: (n: string) => string | undefined };
}) {
	const { workspaceId } = params;

	const sid = getOrCreateSessionId(cookies as Parameters<typeof getOrCreateSessionId>[0]);
	const session = getSession(sid);
	if (!session.workspaceIds?.includes(workspaceId)) {
		throw redirect(302, "/");
	}
	if (!session.workspaceGrants?.[workspaceId]) {
		patchSession(sid, {
			addWorkspaceGrant: { workspaceId, access: "readWrite" },
		});
		const updated = getSession(sid);
		if (!updated.workspaceGrants?.[workspaceId]) {
			throw redirect(302, "/");
		}
	}

	const collections = getWorkspaceCollections(workspaceId);
	const inCollection = new Set(collections.flatMap((c) => c.whiteboardIds));
	const rootIds = getWorkspaceWhiteboards(workspaceId).filter((id) => !inCollection.has(id));
	const whiteboards = rootIds.map((id) => {
		const meta = readRoomMetaFull(`${workspaceId}/${id}`);
		return {
			id,
			name: meta?.name,
			description: meta?.description,
			createdAt: meta?.createdAt ?? null,
			lastUpdatedAt: meta?.lastUpdatedAt ?? null,
		};
	});
	const access = session.workspaceGrants?.[workspaceId] ?? "read";
	return {
		workspaceId,
		whiteboards,
		collections,
		access,
	};
}
