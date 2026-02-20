import { redirect } from "@sveltejs/kit";
import { getOrCreateSessionId } from "$lib/server/auth/session-cookie.js";
import { getSession, patchSession } from "$lib/server/auth/session-store.js";
import { getCollectionBySlug } from "$lib/server/storage/workspace-store.js";
import { readRoomMetaFull } from "$lib/server/storage/room-storage.js";

export function load({
	params,
	cookies,
}: {
	params: { workspaceId: string; collection: string };
	cookies: { get: (n: string) => string | undefined };
}) {
	const { workspaceId, collection } = params;

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

	const collectionData = getCollectionBySlug(workspaceId, collection);
	if (!collectionData) {
		throw redirect(302, `/workspace/${workspaceId}`);
	}
	const whiteboards = collectionData.whiteboardIds.map((id) => {
		const roomId = `${workspaceId}/${collection}/${id}`;
		const meta = readRoomMetaFull(roomId);
		return {
			id,
			name: meta?.name,
			description: meta?.description,
			createdAt: meta?.createdAt ?? null,
			lastUpdatedAt: meta?.lastUpdatedAt ?? null,
		};
	});
	return {
		workspaceId,
		collection,
		whiteboards,
		collectionData,
	};
}
