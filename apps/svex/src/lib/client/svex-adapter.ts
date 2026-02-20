/**
 * Adapter that adds svex-specific join body: initialDocument, workspaceKind.
 * Uses fetch so we can reject on 403 (access denied) instead of hanging until timeout.
 */
import {
	createDefaultAdapter,
	type ExcalidrawMultiplayerAdapter,
	type RoomConnection,
	type RoomEvent,
	type RoomPush,
	type RoomUserInfo,
} from "svelte-excalidraw/adapter";
import type { WorkspaceKind } from "$lib/core/types/workspace-types.js";

/** Thrown when stream POST returns 403. Check err.code === "FORBIDDEN". */
export class StreamForbiddenError extends Error {
	code = "FORBIDDEN" as const;
	constructor() {
		super("Access denied");
		this.name = "StreamForbiddenError";
	}
}

type JoinExtras = {
	initialDocument?: { elements: unknown[]; files: Record<string, unknown> };
	workspaceKind?: WorkspaceKind;
};

export interface SvexAdapterOptions {
	streamUrl: (roomId: string) => string;
	getJoinExtras?: (roomId: string) => JoinExtras;
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
					yield queue.shift()!;
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

export function createSvexAdapter(options: SvexAdapterOptions): ExcalidrawMultiplayerAdapter {
	const { streamUrl, getJoinExtras } = options;
	const defaultAdapter = createDefaultAdapter({ streamUrl });

	return {
		async join(roomId: string, userInfo: RoomUserInfo): Promise<RoomConnection> {
			const extras = getJoinExtras?.(roomId) ?? {};
			const url = streamUrl(roomId);
			const queue = createQueue<RoomEvent>();
			let resolveUserId: (id: string) => void;
			const userIdPromise = new Promise<string>((resolve, reject) => {
				resolveUserId = resolve;
				setTimeout(
					() => reject(new Error("Join timeout: no init from stream")),
					12_000,
				);
			});

			const body = {
				roomId,
				username: userInfo.username,
				...(userInfo.color && { color: userInfo.color }),
				...(extras.initialDocument && { initialDocument: extras.initialDocument }),
				...(extras.workspaceKind && { workspaceKind: extras.workspaceKind }),
			};

			const controller = new AbortController();
			const res = await fetch(url, {
				method: "POST",
				body: JSON.stringify(body),
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				signal: controller.signal,
			});

			if (res.status === 403) {
				queue.close();
				throw new StreamForbiddenError();
			}
			if (!res.ok) {
				queue.close();
				throw new Error(`Stream failed: ${res.status}`);
			}

			const reader = res.body?.getReader();
			if (!reader) {
				queue.close();
				throw new Error("No response body");
			}

			// Parse SSE: event lines + data lines, blocks separated by \n\n
			let buffer = "";
			const decoder = new TextDecoder();
			(async () => {
				try {
					for (;;) {
						const { done, value } = await reader.read();
						if (done) break;
						buffer += decoder.decode(value, { stream: true });
						const blocks = buffer.split("\n\n");
						buffer = blocks.pop() ?? "";
						for (const block of blocks) {
							let data: string | null = null;
							for (const line of block.split("\n")) {
								if (line.startsWith("data:")) {
									data = line.slice(5).trim();
									break;
								}
							}
							if (!data) continue;
							try {
								const parsed = JSON.parse(data) as RoomEvent & { userId?: string };
								queue.push(parsed as RoomEvent);
								if (parsed.type === "init" && parsed.userId) {
									resolveUserId(parsed.userId);
								}
							} catch {
								// ignore
							}
						}
					}
				} catch (err) {
					// AbortError is expected when leave() calls controller.abort() during unmount/navigation
					if (err instanceof Error && err.name !== "AbortError") {
						console.error("[svex-adapter] stream read error", err);
					}
				} finally {
					queue.close();
				}
			})();

			const userId = await userIdPromise;
			return {
				userId,
				subscribe() {
					return queue.iterate();
				},
				leave() {
					controller.abort();
					queue.close();
				},
			};
		},

		async push(roomId: string, userId: string, payload: RoomPush): Promise<void> {
			await defaultAdapter.push(roomId, userId, payload);
		},
	};
}
