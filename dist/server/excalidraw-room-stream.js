/**
 * Batteries-included SSE stream guts for Excalidraw multiplayer rooms.
 * You own the POST: do auth, get roomId/username however you want, then call this.
 * Persistence is enabled by default (file storage). Set persist: false for in-memory-only (e.g. demos).
 */
import { produce } from "sveltekit-sse";
import { joinRoom, leaveRoom, broadcastCollaboratorJoined, setPendingInitialDoc, hasPersistenceConfigured, } from "./excalidraw-room-state.js";
import { registerFileStorage } from "./excalidraw-room-file-storage.js";
/**
 * Returns the SSE response for one join. Use from your POST after auth and parsing.
 */
export async function handleExcalidrawStream(_request, options) {
    const { roomId, username, color, initialDocument, onJoin, persist = true } = options;
    if (persist && !hasPersistenceConfigured()) {
        registerFileStorage();
    }
    if (initialDocument) {
        setPendingInitialDoc(roomId, initialDocument);
    }
    let joinedUserId = null;
    return produce(async ({ emit, lock, }) => {
        const clientEmit = (eventName, data) => {
            emit(eventName, data);
        };
        const { userId, document, collaborators } = joinRoom(roomId, username, clientEmit, color ? { color } : undefined);
        joinedUserId = userId;
        onJoin?.(roomId, userId);
        emit("message", JSON.stringify({ type: "init", document, userId, collaborators }));
        broadcastCollaboratorJoined(roomId, userId, {
            id: userId,
            username,
            ...(color && { color }),
        });
        return function stop() {
            leaveRoom(roomId, userId);
            lock.set(false);
        };
    }, {
        stop() {
            if (joinedUserId) {
                leaveRoom(roomId, joinedUserId);
                joinedUserId = null;
            }
        },
    });
}
