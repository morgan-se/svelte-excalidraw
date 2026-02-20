/**
 * Batteries-included SSE stream guts for Excalidraw multiplayer rooms.
 * You own the POST: do auth, get roomId/username however you want, then call this.
 * Persistence is enabled by default (file storage). Set persist: false for in-memory-only (e.g. demos).
 */
import { produce } from "sveltekit-sse";
import {
	joinRoom,
	leaveRoom,
	broadcastCollaboratorJoined,
	setPendingInitialDoc,
	hasPersistenceConfigured,
} from "./excalidraw-room-state.js";
import { registerFileStorage } from "./excalidraw-room-file-storage.js";
import type { RoomDocument } from "./excalidraw-room-state.js";

export interface ExcalidrawStreamJoinOptions {
	roomId: string;
	username: string;
	color?: { background: string; stroke: string };
	/** When provided, used as initial room document for this room (e.g. host uploading file-system doc). */
	initialDocument?: RoomDocument;
	/** Called after join; e.g. for app to set room metadata (e.g. host userId for local rooms). */
	onJoin?: (roomId: string, userId: string) => void;
	/** When false, room state is in-memory only (cleared when last peer leaves). Default true = file storage. */
	persist?: boolean;
}

/**
 * Returns the SSE response for one join. Use from your POST after auth and parsing.
 */
export async function handleExcalidrawStream(
	_request: Request,
	options: ExcalidrawStreamJoinOptions,
): Promise<Response> {
	const { roomId, username, color, initialDocument, onJoin, persist = true } = options;

	if (persist && !hasPersistenceConfigured()) {
		registerFileStorage();
	}

	if (initialDocument) {
		setPendingInitialDoc(roomId, initialDocument);
	}

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
			onJoin?.(roomId, userId);

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
