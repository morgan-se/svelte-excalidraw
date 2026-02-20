import { redirect } from "@sveltejs/kit";
import type { GrantAccess } from "$lib/core/types/session-types.js";
import { getOrCreateSessionId } from "$lib/server/auth/session-cookie.js";
import { getSession, patchSession } from "$lib/server/auth/session-store.js";
import { getConfig } from "$lib/server/config.js";

export function load({
	params,
	cookies,
}: {
	params: { workspaceId: string; collection?: string; roomId: string };
	cookies: { get: (n: string) => string | undefined; set: (n: string, v: string, o: object) => void };
}) {
	const { workspaceId, collection, roomId } = params;
	const segmentId = collection ? `${collection}/${roomId}` : roomId;
	if (!segmentId) throw redirect(302, "/");

	const sid = getOrCreateSessionId(cookies);
	let session = getSession(sid);
	const isEphemeral = workspaceId === "ephemeral";

	if (isEphemeral) {
		const config = getConfig();
		if (!config.ephemeral.enabled) throw redirect(302, "/");
		const access: GrantAccess = session.ephemeralGrants?.[roomId] ?? "readWrite";
		if (!session.ephemeralGrants?.[roomId]) throw redirect(302, "/");
		const isEphemeralCreator = session.ephemeralRooms?.some((r) => r.id === roomId) ?? false;
		return { workspaceId, roomId: segmentId, access, isEphemeral: true, isEphemeralCreator, isRemote: false };
	}

	const actualRoomId = `${workspaceId}/${segmentId}`;
	const hasWorkspaceGrant = session.workspaceGrants?.[workspaceId];
	const hasWhiteboardGrant = session.whiteboardGrants?.[actualRoomId];
	const inList = session.workspaceIds?.includes(workspaceId);
	if (!hasWorkspaceGrant && !hasWhiteboardGrant && inList) {
		patchSession(sid, {
			addWorkspaceGrant: { workspaceId, access: "readWrite" },
		});
		session = getSession(sid);
	}
	const access: GrantAccess =
		session.whiteboardGrants?.[actualRoomId] ?? session.workspaceGrants?.[workspaceId] ?? "read";
	if (!session.workspaceGrants?.[workspaceId] && !session.whiteboardGrants?.[actualRoomId])
		throw redirect(302, "/");
	return { workspaceId, roomId: segmentId, access, isEphemeral: false, isEphemeralCreator: false, isRemote: false };
}
