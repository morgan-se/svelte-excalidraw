import { handleExcalidrawStream } from "svelte-excalidraw/server";
import { getSessionId } from "$lib/server/auth/session-cookie.js";
import { getSession } from "$lib/server/auth/session-store.js";
import { getRoomMetadata, setRoomMetadata, touchViewedAt, isEphemeralExpired } from "$lib/server/room-ttl.js";
import type { WorkspaceKind } from "$lib/core/types/workspace-types.js";

export const prerender = false;

type RoomDocument = { elements: unknown[]; files: Record<string, unknown> };

export async function POST({
	request,
	params,
	cookies,
}: {
	request: Request;
	params: { workspaceId: string; collection?: string; roomId: string };
	cookies: { get: (n: string) => string | undefined };
}) {
	const { workspaceId, collection, roomId } = params;
	const segmentId = collection ? `${collection}/${roomId}` : roomId;
	const isEphemeral = workspaceId === "ephemeral";
	const actualRoomId = isEphemeral ? roomId : `${workspaceId}/${segmentId}`;

	const sid = getSessionId(cookies);
	if (!sid) return new Response("Forbidden", { status: 403 });
	const session = getSession(sid);

	if (isEphemeral) {
		const grant = session.ephemeralGrants?.[roomId] ?? session.whiteboardGrants?.[roomId];
		if (grant !== "read" && grant !== "readWrite") {
			return new Response("Forbidden", { status: 403 });
		}
		if (getRoomMetadata(actualRoomId) && isEphemeralExpired(actualRoomId)) {
			return new Response("Whiteboard expired", { status: 410 });
		}
	} else {
		const grant =
			session.whiteboardGrants?.[actualRoomId] ?? session.workspaceGrants?.[workspaceId];
		if (grant !== "read" && grant !== "readWrite") {
			return new Response("Forbidden", { status: 403 });
		}
	}

	const body = (await request.json().catch(() => ({}))) as {
		username?: string;
		color?: { background: string; stroke: string };
		initialDocument?: RoomDocument;
		workspaceKind?: WorkspaceKind;
	};

	const username = body.username?.trim();
	if (!username) {
		return new Response("Missing username", { status: 400 });
	}

	// hostUserId only for local (host has folder, room closes when host leaves).
	// Remote = guest share link; host connects via /whiteboard/local/... and sets hostUserId there.
	const isLocalRoom = body.workspaceKind === "local";
	const onJoin = (rid: string, userId: string) => {
		if (!getRoomMetadata(rid)) {
			const now = Date.now();
			setRoomMetadata(rid, {
				createdAt: now,
				lastUpdatedAt: now,
				hostUserId: isLocalRoom ? userId : undefined,
			});
		} else {
			touchViewedAt(rid);
		}
	};

	return handleExcalidrawStream(request, {
		roomId: actualRoomId,
		username,
		color: body.color,
		initialDocument: body.initialDocument as Parameters<typeof handleExcalidrawStream>[1]["initialDocument"],
		onJoin,
	});
}
