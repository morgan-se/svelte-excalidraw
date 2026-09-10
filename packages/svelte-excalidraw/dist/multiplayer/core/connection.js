/**
 * Room connection lifecycle: join, init data resolution, subscribe loop.
 */
function docPayload(doc) {
    return {
        elements: [...doc.elements],
        files: doc.files ?? {},
        scrollToContent: true,
    };
}
/**
 * Start connection: join, then subscribe loop. Initial document comes only from the stream's init event.
 * Cleanup is delivered via onReady(cleanup); nothing is returned.
 */
export async function startConnection(opts) {
    const { adapter, roomId, userInfo, callbacks } = opts;
    let resolved = false;
    const resolveInitialData = (value) => {
        if (resolved)
            return;
        resolved = true;
        callbacks.onInitialData(value);
    };
    function cleanup() {
        if (connRef)
            connRef.leave();
    }
    let connRef = null;
    try {
        const conn = await adapter.join(roomId, userInfo);
        connRef = conn;
        callbacks.onConnected(conn);
        callbacks.onReady(cleanup);
        for await (const ev of conn.subscribe()) {
            switch (ev.type) {
                case "init":
                    resolveInitialData(docPayload({
                        elements: ev.document.elements,
                        files: ev.document.files,
                    }));
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
    }
    catch (e) {
        console.error("[ExcalidrawMultiplayer] join error", e);
        callbacks.onJoinError?.(e);
    }
}
