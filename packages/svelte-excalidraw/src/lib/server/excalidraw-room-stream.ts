/**
 * Batteries-included SSE stream guts for Excalidraw multiplayer rooms.
 * You own the POST: do auth, get roomId/username however you want, then call this.
 */
import { produce } from "sveltekit-sse";
import {
	joinRoom,
	leaveRoom,
	broadcastCollaboratorJoined,
} from "./excalidraw-room-state.js";

export interface ExcalidrawStreamJoinOptions {
	roomId: string;
	username: string;
	color?: { background: string; stroke: string };
}

/**
 * Returns the SSE response for one join. Use from your POST after auth and parsing.
 */
export async function handleExcalidrawStream(
	_request: Request,
	options: ExcalidrawStreamJoinOptions,
): Promise<Response> {
	const { roomId, username, color } = options;

	let joinedUserId: string | null = null;

	return produce(
		async ({
			emit,
			lock,
		}: {
			emit: (eventName: string, data: string) => { error?: Error };
			lock: { set: (value: boolean) => void };
		}) => {
			const clientEmit: (event: string, data: string) => void = (eventName, data) => {
				emit(eventName, data);
			};

			const { userId, document, collaborators } = joinRoom(
				roomId,
				username,
				clientEmit,
				color ? { color } : undefined,
			);
			joinedUserId = userId;

			emit(
				"message",
				JSON.stringify({ type: "init", document, userId, collaborators }),
			);

			broadcastCollaboratorJoined(roomId, userId, {
				id: userId,
				username,
				...(color && { color }),
			});

			return function stop() {
				leaveRoom(roomId, userId);
				lock.set(false);
			};
		},
		{
			stop() {
				if (joinedUserId) {
					leaveRoom(roomId, joinedUserId);
					joinedUserId = null;
				}
			},
		},
	);
}
