/**
 * Default multiplayer adapter: SvelteKit SSE (room stream) + Remote functions (push elements / awareness).
 * You provide the full stream URL per room; the lib does not append any path segments.
 */
import { source } from "sveltekit-sse";
import { pushElements as pushElementsRemote, pushFiles as pushFilesRemote, pushViewport as pushViewportRemote, pushFollowState as pushFollowStateRemote, updateUserInfo as updateUserInfoRemote, pushAwareness as pushAwarenessRemote, } from "../excalidraw-room.remote.js";
function createQueue() {
    const queue = [];
    let resolve = null;
    let closed = false;
    return {
        push(value) {
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
                    const value = queue.shift();
                    yield value;
                }
                else if (closed) {
                    return;
                }
                else {
                    await new Promise((r) => {
                        resolve = r;
                    });
                }
            }
        },
    };
}
export function createDefaultAdapter(options) {
    const { streamUrl } = options;
    return {
        async join(roomId, userInfo) {
            const url = streamUrl(roomId);
            const queue = createQueue();
            let resolveUserId;
            const JOIN_TIMEOUT_MS = 12_000;
            const userIdPromise = new Promise((resolve, reject) => {
                resolveUserId = resolve;
                setTimeout(() => reject(new Error("Join timeout: no init from stream")), JOIN_TIMEOUT_MS);
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
            messageStore.subscribe((data) => {
                if (data == null || data === "")
                    return;
                try {
                    const parsed = JSON.parse(data);
                    queue.push(parsed);
                    if (parsed.type === "init" && parsed.userId) {
                        resolveUserId(parsed.userId);
                    }
                }
                catch {
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
        async push(roomId, userId, payload) {
            switch (payload.type) {
                case "elements":
                    await pushElementsRemote({ roomId, userId, elements: payload.elements });
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
