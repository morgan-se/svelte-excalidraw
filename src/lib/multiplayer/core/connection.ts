/**
 * Room connection lifecycle: join, init data resolution, subscribe loop.
 */

import type { ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { RoomUserInfo, RoomConnection, RoomEvent } from "../types.js";

export interface ConnectionCallbacks {
	onConnected(conn: RoomConnection): void;
	/** Called synchronously with the cleanup so caller can store it before any navigation. */
	onReady(cleanup: () => void): void;
	onInitialData(doc: ExcalidrawInitialDataState): void;
	onCollaboratorEvent(ev: RoomEvent): void;
	onElements(elements: readonly ExcalidrawElement[]): void;
	onFiles(files: Readonly<Record<string, unknown>>): void;
	onFollowedBy(followedBy: string[]): void;
	onViewport(userId: string, sceneBounds: [number, number, number, number]): void;
	/** Called when room is closed by host (local rooms). Hide canvas and show message. */
	onRoomClosed?(): void;
	/** Called when join fails (e.g. 403 Forbidden). Use to show "Access denied" and link to workspace. */
	onJoinError?(error: unknown): void;
}

export interface StartConnectionOptions {
	adapter: import("../types.js").ExcalidrawMultiplayerAdapter;
	roomId: string;
	userInfo: RoomUserInfo;
	callbacks: ConnectionCallbacks;
}

function docPayload(doc: {
	elements: readonly unknown[];
	files?: Record<string, unknown>;
}): ExcalidrawInitialDataState {
	return {
		elements: [...doc.elements] as ExcalidrawElement[],
		files: doc.files ?? {},
		scrollToContent: true,
	};
}

/**
 * Start connection: join, then subscribe loop. Initial document comes only from the stream's init event.
 * Cleanup is delivered via onReady(cleanup); nothing is returned.
 */
export async function startConnection(
	opts: StartConnectionOptions,
): Promise<void> {
	const { adapter, roomId, userInfo, callbacks } = opts;
	let resolved = false;

	const resolveInitialData = (value: ExcalidrawInitialDataState) => {
		if (resolved) return;
		resolved = true;
		callbacks.onInitialData(value);
	};

	function cleanup() {
		if (connRef) connRef.leave();
	}

	let connRef: RoomConnection | null = null;

	try {
		const conn = await adapter.join(roomId, userInfo);
		connRef = conn;
		callbacks.onConnected(conn);
		callbacks.onReady(cleanup);

		for await (const ev of conn.subscribe()) {
			switch (ev.type) {
				case "init":
					resolveInitialData(
						docPayload({
							elements: ev.document.elements,
							files: ev.document.files as Record<string, unknown> | undefined,
						}),
					);
					callbacks.onCollaboratorEvent(ev);
					break;
				case "awareness":
				case "collaborator_joined":
				case "collaborator_updated":
				case "collaborator_left":
				case "sync":
					callbacks.onCollaboratorEvent(ev);
					break;
				case "elements":
					callbacks.onElements(ev.elements);
					break;
				case "files":
					callbacks.onFiles(ev.files);
					break;
				case "followed_by":
					callbacks.onFollowedBy(ev.followedBy);
					break;
				case "viewport":
					callbacks.onViewport(ev.userId, ev.sceneBounds);
					break;
				case "host_left":
					callbacks.onRoomClosed?.();
					break;
			}
		}
	} catch (e) {
		console.error("[ExcalidrawMultiplayer] join error", e);
		callbacks.onJoinError?.(e);
	}
}
