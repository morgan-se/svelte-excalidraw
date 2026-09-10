/** Set image elements to status "saved" when we have the file, so clients get versionNonce updates on move. */
function normalizeImageElements(elements, files) {
    if (Object.keys(files).length === 0)
        return elements;
    return elements.map((el) => {
        if (el.type !== "image")
            return el;
        const fileId = el.fileId;
        if (!fileId || !files[fileId])
            return el;
        return { ...el, status: "saved" };
    });
}
const rooms = new Map();
const PERSIST_DEBOUNCE_MS = 500;
let persistCallback = null;
let loadCallback = null;
/** True if persist/load callbacks have been set (e.g. by app or registerFileStorage). */
export function hasPersistenceConfigured() {
    return loadCallback !== null;
}
/** Pending initial document for the next getOrCreateRoom(roomId). Used when host joins with file-system doc. */
const pendingInitialDocs = new Map();
export function setPersistCallback(cb) {
    persistCallback = cb;
}
export function setLoadCallback(cb) {
    loadCallback = cb;
}
/** Set initial document for a room before the first join. Cleared after getOrCreateRoom uses it. */
export function setPendingInitialDoc(roomId, doc) {
    pendingInitialDocs.set(roomId, doc);
}
let onLeaveCallback = null;
/** Called when a user leaves a room. Return { closeRoom: true } to broadcast host_left and delete room (e.g. local host left). */
export function setOnLeaveCallback(cb) {
    onLeaveCallback = cb;
}
function getOrCreateRoom(roomId) {
    let room = rooms.get(roomId);
    if (!room) {
        let elements = [];
        let files = {};
        const pending = pendingInitialDocs.get(roomId);
        if (pending) {
            pendingInitialDocs.delete(roomId);
            elements = (pending.elements ?? []);
            files = pending.files ?? {};
            elements = normalizeImageElements(elements, files);
        }
        else if (loadCallback) {
            const loaded = loadCallback(roomId);
            if (loaded) {
                elements = loaded.elements ?? [];
                files = loaded.files ?? {};
                elements = normalizeImageElements(elements, files);
            }
        }
        room = {
            elements,
            files,
            clients: new Map(),
            persistTimeout: null,
            followState: new Map(),
        };
        rooms.set(roomId, room);
    }
    return room;
}
function schedulePersist(roomId, room) {
    if (room.persistTimeout)
        clearTimeout(room.persistTimeout);
    room.persistTimeout = setTimeout(() => {
        room.persistTimeout = null;
        persistCallback?.(roomId, { elements: room.elements, files: room.files });
    }, PERSIST_DEBOUNCE_MS);
}
/** Remove room from in-memory state (e.g. when deleting persisted room). */
export function deleteRoomData(roomId) {
    const room = rooms.get(roomId);
    if (room?.persistTimeout)
        clearTimeout(room.persistTimeout);
    rooms.delete(roomId);
}
/** Simple server merge: by id, higher version wins; then broadcast. No @excalidraw/excalidraw on server. */
function mergeElements(server, incoming, files) {
    const byId = new Map();
    for (const el of server)
        byId.set(el.id, { ...el });
    for (const el of incoming) {
        const existing = byId.get(el.id);
        const incVersion = Number(el.version ?? 0);
        const incNonce = Number(el.versionNonce ?? 0);
        const curVersion = existing ? Number(existing.version ?? 0) : 0;
        const curNonce = existing ? Number(existing.versionNonce ?? 0) : 0;
        if (!existing || incVersion > curVersion || (incVersion === curVersion && incNonce > curNonce)) {
            byId.set(el.id, { ...el });
        }
    }
    return normalizeImageElements(Array.from(byId.values()), files);
}
export function applyElements(roomId, userId, elements) {
    const room = getOrCreateRoom(roomId);
    room.elements = mergeElements(room.elements, elements, room.files);
    schedulePersist(roomId, room);
    const payload = JSON.stringify({ type: "elements", elements: room.elements });
    room.clients.forEach((client) => {
        if (client.userId !== userId)
            client.emit("message", payload);
    });
}
/** Merge incoming files into room, persist, and broadcast to all clients so peers get images. */
export function applyFiles(roomId, userId, files) {
    const room = getOrCreateRoom(roomId);
    for (const [id, file] of Object.entries(files)) {
        room.files[id] = { ...file };
    }
    schedulePersist(roomId, room);
    const payload = JSON.stringify({ type: "files", files: room.files });
    room.clients.forEach((client) => {
        client.emit("message", payload);
    });
}
export function broadcastAwareness(roomId, userId, awareness) {
    const room = getOrCreateRoom(roomId);
    const client = room.clients.get(userId);
    if (!client)
        return;
    client.awareness = awareness;
    client.collaborator = {
        ...client.collaborator,
        pointer: awareness.pointer,
        button: awareness.button,
        selectedElementIds: awareness.selectedElementIds ?? {},
    };
    const payload = JSON.stringify({ type: "awareness", userId, awareness });
    room.clients.forEach((c) => {
        if (c.userId !== userId)
            c.emit("message", payload);
    });
}
export function joinRoom(roomId, username, emit, opts) {
    const room = getOrCreateRoom(roomId);
    const userId = crypto.randomUUID();
    const collaborator = {
        id: userId,
        socketId: userId,
        username,
        ...(opts?.color && { color: opts.color }),
    };
    const client = {
        userId,
        username,
        collaborator,
        awareness: null,
        emit,
    };
    room.clients.set(userId, client);
    const collaborators = {};
    room.clients.forEach((c) => {
        collaborators[c.userId] = {
            ...c.collaborator,
            id: c.userId,
            socketId: c.userId,
        };
    });
    return {
        userId,
        document: { elements: room.elements, files: room.files },
        collaborators,
    };
}
export function updateCollaborator(roomId, userId, updates) {
    const room = rooms.get(roomId);
    if (!room)
        return;
    const client = room.clients.get(userId);
    if (!client)
        return;
    if (updates.username)
        client.username = updates.username;
    client.collaborator = {
        ...client.collaborator,
        ...updates,
        id: userId,
        socketId: userId,
    };
    const payload = JSON.stringify({
        type: "collaborator_updated",
        collaborator: { ...client.collaborator },
    });
    room.clients.forEach((c) => c.emit("message", payload));
}
/** Update who a user is following; notify affected leaders of their followedBy set. */
export function setFollowState(roomId, userId, followingUserId) {
    const room = rooms.get(roomId);
    if (!room)
        return;
    const prev = room.followState.get(userId);
    if (prev)
        room.followState.delete(userId);
    if (followingUserId)
        room.followState.set(userId, followingUserId);
    function notifyLeader(leaderId) {
        const followedBy = [];
        room.followState.forEach((led, fid) => {
            if (led === leaderId)
                followedBy.push(fid);
        });
        const client = room.clients.get(leaderId);
        if (client) {
            client.emit("message", JSON.stringify({ type: "followed_by", followedBy }));
        }
    }
    if (prev && prev !== followingUserId)
        notifyLeader(prev);
    if (followingUserId)
        notifyLeader(followingUserId);
}
export function broadcastViewport(roomId, userId, sceneBounds) {
    const room = rooms.get(roomId);
    if (!room)
        return;
    const payload = JSON.stringify({ type: "viewport", userId, sceneBounds });
    const followers = new Set();
    room.followState.forEach((leaderId, followerId) => {
        if (leaderId === userId)
            followers.add(followerId);
    });
    room.clients.forEach((c) => {
        if (followers.has(c.userId))
            c.emit("message", payload);
    });
}
export function roomExists(roomId) {
    return rooms.has(roomId);
}
export function getRoomDocument(roomId) {
    const room = rooms.get(roomId);
    if (!room)
        return null;
    return { elements: room.elements, files: room.files };
}
export function leaveRoom(roomId, userId) {
    const room = rooms.get(roomId);
    if (!room)
        return;
    room.followState.delete(userId);
    room.clients.delete(userId);
    const result = onLeaveCallback?.(roomId, userId);
    if (result?.closeRoom) {
        room.clients.forEach((c) => c.emit("message", JSON.stringify({ type: "host_left" })));
        rooms.delete(roomId);
        return;
    }
    const payload = JSON.stringify({ type: "collaborator_left", userId });
    room.clients.forEach((c) => c.emit("message", payload));
    if (room.clients.size === 0)
        rooms.delete(roomId);
}
export function broadcastCollaboratorJoined(roomId, userId, collaborator) {
    const room = rooms.get(roomId);
    if (!room)
        return;
    const payload = JSON.stringify({
        type: "collaborator_joined",
        collaborator: { ...collaborator, id: userId, socketId: userId },
    });
    room.clients.forEach((c) => {
        if (c.userId !== userId)
            c.emit("message", payload);
    });
}
