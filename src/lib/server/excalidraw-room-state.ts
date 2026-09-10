/**
 * In-memory room state for the default SvelteKit multiplayer backend.
 * No browser-only deps: we do a simple merge by id/version; clients do full reconcile.
 */
type AwarenessUpdate = {
	pointer: { x: number; y: number; tool: "pointer" | "laser" };
	button?: "up" | "down";
	selectedElementIds?: Readonly<Record<string, true>>;
};
type SceneBounds = [number, number, number, number];

/** Server stores elements as plain objects (id, version, versionNonce for merge). */
export type ElementLike = Readonly<Record<string, unknown>> & { id: string; version?: number; versionNonce?: number };

export type RoomDocument = { elements: ElementLike[]; files: Record<string, unknown> };

/** Set image elements to status "saved" when we have the file, so clients get versionNonce updates on move. */
function normalizeImageElements(
	elements: ElementLike[],
	files: Record<string, unknown>,
): ElementLike[] {
	if (Object.keys(files).length === 0) return elements;
	return elements.map((el) => {
		if ((el as Record<string, unknown>).type !== "image") return el;
		const fileId = (el as Record<string, unknown>).fileId as string | undefined;
		if (!fileId || !files[fileId]) return el;
		return { ...el, status: "saved" } as ElementLike;
	});
}

type Emit = (event: string, data: string) => void;

interface CollaboratorShape {
	id: string;
	socketId?: string;
	username: string;
	color?: { background: string; stroke: string };
	pointer?: { x: number; y: number; tool: string };
	button?: string;
	selectedElementIds?: Record<string, boolean>;
	avatarUrl?: string;
}

interface Client {
	userId: string;
	username: string;
	collaborator: CollaboratorShape;
	awareness: AwarenessUpdate | null;
	emit: Emit;
}

interface RoomData {
	elements: ElementLike[];
	files: Record<string, unknown>;
	clients: Map<string, Client>;
	persistTimeout: ReturnType<typeof setTimeout> | null;
	/** followerId -> leaderId (who this user is following) */
	followState: Map<string, string>;
}

const rooms = new Map<string, RoomData>();

const PERSIST_DEBOUNCE_MS = 500;
let persistCallback: ((roomId: string, doc: RoomDocument) => void) | null = null;
let loadCallback: ((roomId: string) => RoomDocument | null) | null = null;

/** True if persist/load callbacks have been set (e.g. by app or registerFileStorage). */
export function hasPersistenceConfigured(): boolean {
	return loadCallback !== null;
}

/** Pending initial document for the next getOrCreateRoom(roomId). Used when host joins with file-system doc. */
const pendingInitialDocs = new Map<string, RoomDocument>();

export function setPersistCallback(cb: (roomId: string, doc: RoomDocument) => void) {
	persistCallback = cb;
}

export function setLoadCallback(cb: (roomId: string) => RoomDocument | null) {
	loadCallback = cb;
}

/** Set initial document for a room before the first join. Cleared after getOrCreateRoom uses it. */
export function setPendingInitialDoc(roomId: string, doc: RoomDocument): void {
	pendingInitialDocs.set(roomId, doc);
}

type OnLeaveResult = void | { closeRoom: true };
let onLeaveCallback: ((roomId: string, userId: string) => OnLeaveResult) | null = null;

/** Called when a user leaves a room. Return { closeRoom: true } to broadcast host_left and delete room (e.g. local host left). */
export function setOnLeaveCallback(cb: (roomId: string, userId: string) => OnLeaveResult): void {
	onLeaveCallback = cb;
}

function getOrCreateRoom(roomId: string): RoomData {
	let room = rooms.get(roomId);
	if (!room) {
		let elements: ElementLike[] = [];
		let files: Record<string, unknown> = {};
		const pending = pendingInitialDocs.get(roomId);
		if (pending) {
			pendingInitialDocs.delete(roomId);
			elements = (pending.elements ?? []) as ElementLike[];
			files = pending.files ?? {};
			elements = normalizeImageElements(elements, files);
		} else if (loadCallback) {
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

function schedulePersist(roomId: string, room: RoomData) {
	if (room.persistTimeout) clearTimeout(room.persistTimeout);
	room.persistTimeout = setTimeout(() => {
		room.persistTimeout = null;
		persistCallback?.(roomId, { elements: room.elements, files: room.files });
	}, PERSIST_DEBOUNCE_MS);
}

/** Remove room from in-memory state (e.g. when deleting persisted room). */
export function deleteRoomData(roomId: string): void {
	const room = rooms.get(roomId);
	if (room?.persistTimeout) clearTimeout(room.persistTimeout);
	rooms.delete(roomId);
}

/** Simple server merge: by id, higher version wins; then broadcast. No @excalidraw/excalidraw on server. */
function mergeElements(
	server: ElementLike[],
	incoming: readonly ElementLike[],
	files: Record<string, unknown>,
): ElementLike[] {
	const byId = new Map<string, ElementLike>();
	for (const el of server) byId.set(el.id, { ...el });
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

export function applyElements(
	roomId: string,
	userId: string,
	elements: readonly ElementLike[],
): void {
	const room = getOrCreateRoom(roomId);
	room.elements = mergeElements(room.elements, elements, room.files);
	schedulePersist(roomId, room);
	const payload = JSON.stringify({ type: "elements", elements: room.elements });
	room.clients.forEach((client) => {
		if (client.userId !== userId) client.emit("message", payload);
	});
}

/** Merge incoming files into room, persist, and broadcast to all clients so peers get images. */
export function applyFiles(
	roomId: string,
	userId: string,
	files: Readonly<Record<string, { mimeType: string; id: string; dataURL: string; created?: number; lastRetrieved?: number }>>,
): void {
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

export function broadcastAwareness(
	roomId: string,
	userId: string,
	awareness: AwarenessUpdate,
): void {
	const room = getOrCreateRoom(roomId);
	const client = room.clients.get(userId);
	if (!client) return;
	client.awareness = awareness;
	client.collaborator = {
		...client.collaborator,
		pointer: awareness.pointer,
		button: awareness.button,
		selectedElementIds: awareness.selectedElementIds ?? {},
	};
	const payload = JSON.stringify({ type: "awareness", userId, awareness });
	room.clients.forEach((c) => {
		if (c.userId !== userId) c.emit("message", payload);
	});
}

export function joinRoom(
	roomId: string,
	username: string,
	emit: Emit,
	opts?: { color?: { background: string; stroke: string } },
): {
	userId: string;
	document: { elements: ElementLike[]; files: Record<string, unknown> };
	collaborators: Record<string, CollaboratorShape>;
} {
	const room = getOrCreateRoom(roomId);
	const userId = crypto.randomUUID();
	const collaborator: CollaboratorShape = {
		id: userId,
		socketId: userId,
		username,
		...(opts?.color && { color: opts.color }),
	};
	const client: Client = {
		userId,
		username,
		collaborator,
		awareness: null,
		emit,
	};
	room.clients.set(userId, client);

	const collaborators: Record<string, CollaboratorShape> = {};
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

export function updateCollaborator(
	roomId: string,
	userId: string,
	updates: { username?: string; color?: { background: string; stroke: string }; avatarUrl?: string },
): void {
	const room = rooms.get(roomId);
	if (!room) return;
	const client = room.clients.get(userId);
	if (!client) return;
	if (updates.username) client.username = updates.username;
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
export function setFollowState(
	roomId: string,
	userId: string,
	followingUserId: string | null,
): void {
	const room = rooms.get(roomId);
	if (!room) return;
	const prev = room.followState.get(userId);
	if (prev) room.followState.delete(userId);
	if (followingUserId) room.followState.set(userId, followingUserId);

	function notifyLeader(leaderId: string) {
		const followedBy: string[] = [];
		room!.followState.forEach((led, fid) => {
			if (led === leaderId) followedBy.push(fid);
		});
		const client = room!.clients.get(leaderId);
		if (client) {
			client.emit("message", JSON.stringify({ type: "followed_by", followedBy }));
		}
	}
	if (prev && prev !== followingUserId) notifyLeader(prev);
	if (followingUserId) notifyLeader(followingUserId);
}

export function broadcastViewport(
	roomId: string,
	userId: string,
	sceneBounds: SceneBounds,
): void {
	const room = rooms.get(roomId);
	if (!room) return;
	const payload = JSON.stringify({ type: "viewport", userId, sceneBounds });
	const followers = new Set<string>();
	room.followState.forEach((leaderId, followerId) => {
		if (leaderId === userId) followers.add(followerId);
	});
	room.clients.forEach((c) => {
		if (followers.has(c.userId)) c.emit("message", payload);
	});
}

export function roomExists(roomId: string): boolean {
	return rooms.has(roomId);
}

export function getRoomDocument(roomId: string): {
	elements: ElementLike[];
	files: Record<string, unknown>;
} | null {
	const room = rooms.get(roomId);
	if (!room) return null;
	return { elements: room.elements, files: room.files };
}

export function leaveRoom(roomId: string, userId: string): void {
	const room = rooms.get(roomId);
	if (!room) return;
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
	if (room.clients.size === 0) rooms.delete(roomId);
}

export function broadcastCollaboratorJoined(
	roomId: string,
	userId: string,
	collaborator: CollaboratorShape,
): void {
	const room = rooms.get(roomId);
	if (!room) return;
	const payload = JSON.stringify({
		type: "collaborator_joined",
		collaborator: { ...collaborator, id: userId, socketId: userId },
	});
	room.clients.forEach((c) => {
		if (c.userId !== userId) c.emit("message", payload);
	});
}
