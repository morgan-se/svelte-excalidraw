import { handleExcalidrawStream } from "svelte-excalidraw/server";
import { getRoomMetadata, setRoomMetadata } from "$lib/server/room-ttl.js";

export const prerender = false;

type RoomDocument = { elements: unknown[]; files: Record<string, unknown> };

export async function POST({
	request,
}: {
	request: Request;
	params: { collection?: string; roomId: string };
}) {
	// Local stream: workspace comes from client state; we need roomId from body for internal ID
	const body = (await request.json().catch(() => ({}))) as {
		roomId?: string;
		username?: string;
		color?: { background: string; stroke: string };
		initialDocument?: RoomDocument;
	};

	const username = body.username?.trim();
	if (!username) {
		return new Response("Missing username", { status: 400 });
	}

	// Client sends internal roomId in body (computed from workspace + segmentId)
	const actualRoomId = body.roomId?.trim();
	if (!actualRoomId) {
		return new Response("Missing roomId in body", { status: 400 });
	}

	const onJoin = (rid: string, userId: string) => {
		if (!getRoomMetadata(rid)) {
			const now = Date.now();
			setRoomMetadata(rid, {
				createdAt: now,
				lastUpdatedAt: now,
				hostUserId: userId,
			});
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
