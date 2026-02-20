/**
 * Demo adapter: in-iframe client that talks to the parent window via postMessage.
 * Parent holds room state and broadcasts to both iframes. Single room only.
 */
import type {
	ExcalidrawMultiplayerAdapter,
	RoomConnection,
	RoomEvent,
	RoomPush,
	RoomUserInfo,
} from "svelte-excalidraw";

const SOURCE = "excalidraw-iframe-demo";
const ROOM_ID = "demo";

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
					yield queue.shift()!;
				} else if (closed) return;
				else await new Promise<void>((r) => { resolve = r; });
			}
		},
	};
}

export function createIframeDemoAdapter(): ExcalidrawMultiplayerAdapter {
	return {
		async join(_roomId: string, userInfo: RoomUserInfo): Promise<RoomConnection> {
			const queue = createQueue<RoomEvent>();
			let resolveUserId: (id: string) => void;
			const userIdPromise = new Promise<string>((resolve) => {
				resolveUserId = resolve;
			});

			const handler = (event: MessageEvent) => {
				const d = event.data;
				if (!d || d.source !== SOURCE) return;
				if (d.type === "init" && d.userId) {
					resolveUserId(d.userId);
				}
				queue.push(d as RoomEvent);
			};

			window.addEventListener("message", handler);

			window.parent.postMessage(
				{
					source: SOURCE,
					type: "join",
					roomId: ROOM_ID,
					userInfo: {
						username: userInfo.username,
						...(userInfo.color && { color: userInfo.color }),
					},
				},
				"*",
			);

			const userId = await userIdPromise;

			return {
				userId,
				subscribe() {
					return queue.iterate();
				},
				leave() {
					window.removeEventListener("message", handler);
					window.parent.postMessage({ source: SOURCE, type: "leave", roomId: ROOM_ID, userId }, "*");
					queue.close();
				},
			};
		},

		async push(_roomId: string, userId: string, payload: RoomPush): Promise<void> {
			window.parent.postMessage(
				{ source: SOURCE, type: "push", roomId: ROOM_ID, userId, payload },
				"*",
			);
		},
	};
}
