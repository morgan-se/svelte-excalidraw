/**
 * Default multiplayer adapter: SvelteKit SSE (room stream) + Remote functions (push elements / awareness).
 * You provide the full stream URL per room; the lib does not append any path segments.
 */
import { source } from "sveltekit-sse";
import type { ExcalidrawMultiplayerAdapter, RoomConnection, RoomEvent, RoomPush, RoomUserInfo } from "./types.js";
import {
	pushElements as pushElementsRemote,
	pushFiles as pushFilesRemote,
	pushViewport as pushViewportRemote,
	pushFollowState as pushFollowStateRemote,
	updateUserInfo as updateUserInfoRemote,
	pushAwareness as pushAwarenessRemote,
} from "../excalidraw-room.remote.js";

export interface DefaultAdapterOptions {
	/** Full stream URL for each room. No magic: you choose the path (e.g. (roomId) => `/multiplayer/${roomId}` with +server.ts next to +page). */
	streamUrl: (roomId: string) => string;
}

function createQueue<T>(): {
	push: (value: T) => void;
	close: () => void;
	iterate: () => AsyncIterableIterator<T>;
} {
	const queue: T[] = [];
	let resolve: (() => void) | null = null;
	let closed = false;
	return {
		push(value: T) {
			queue.push(value);
			if (resolve) {
				resolve();
				resolve = null;
			}
		},
		close() {
			closed = true;
			if (resolve) {
				resolve();
				resolve = null;
			}
		},
		async *iterate() {
			while (true) {
				if (queue.length > 0) {
					const value = queue.shift()!;
					yield value;
				} else if (closed) {
					return;
				} else {
					await new Promise<void>((r) => {
						resolve = r;
					});
				}
			}
		},
	};
}

export function createDefaultAdapter(options: DefaultAdapterOptions): ExcalidrawMultiplayerAdapter {
	const { streamUrl } = options;
	return {
		async join(roomId: string, userInfo: RoomUserInfo): Promise<RoomConnection> {
			const url = streamUrl(roomId);
			const queue = createQueue<RoomEvent>();
			let resolveUserId: (id: string) => void;
			const JOIN_TIMEOUT_MS = 12_000;
			const userIdPromise = new Promise<string>((resolve, reject) => {
				resolveUserId = resolve;
				setTimeout(
					() => reject(new Error("Join timeout: no init from stream")),
					JOIN_TIMEOUT_MS,
				);
			});

			const sourceConn = source(url, {
				cache: false,
				options: {
					method: "POST",
					body: JSON.stringify({
						roomId,
						username: userInfo.username,
						...(userInfo.color && { color: userInfo.color }),
					}),
					headers: { "Content-Type": "application/json" },
				},
				close() {
					queue.close();
				},
			});

			const messageStore = sourceConn.select("message");
			messageStore.subscribe((data: string | null | undefined) => {
				if (data == null || data === "") return;
				try {
					const parsed = JSON.parse(data) as RoomEvent & { userId?: string };
					queue.push(parsed as RoomEvent);
					if (parsed.type === "init" && parsed.userId) {
						resolveUserId(parsed.userId);
					}
				} catch {
					// ignore
				}
			});

			const userId = await userIdPromise;
			return {
				userId,
				subscribe() {
					return queue.iterate();
				},
				leave() {
					sourceConn.close();
				},
			};
		},

		async push(roomId: string, userId: string, payload: RoomPush): Promise<void> {
			switch (payload.type) {
				case "elements":
					await pushElementsRemote({ roomId, userId, elements: payload.elements as any });
					break;
				case "files":
					await pushFilesRemote({ roomId, userId, files: { ...payload.files } });
					break;
				case "viewport":
					await pushViewportRemote({ roomId, userId, sceneBounds: payload.sceneBounds });
					break;
				case "followState":
					await pushFollowStateRemote({ roomId, userId, followingUserId: payload.followingUserId });
					break;
				case "userInfo":
					await updateUserInfoRemote({ roomId, userId, userInfo: payload.userInfo });
					break;
				case "awareness":
					await pushAwarenessRemote({ roomId, userId, awareness: payload.awareness });
					break;
			}
		},
	};
}
