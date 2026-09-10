/**
 * In-memory room state for the default SvelteKit multiplayer backend.
 * No browser-only deps: we do a simple merge by id/version; clients do full reconcile.
 */
type AwarenessUpdate = {
    pointer: {
        x: number;
        y: number;
        tool: "pointer" | "laser";
    };
    button?: "up" | "down";
    selectedElementIds?: Readonly<Record<string, true>>;
};
type SceneBounds = [number, number, number, number];
/** Server stores elements as plain objects (id, version, versionNonce for merge). */
export type ElementLike = Readonly<Record<string, unknown>> & {
    id: string;
    version?: number;
    versionNonce?: number;
};
export type RoomDocument = {
    elements: ElementLike[];
    files: Record<string, unknown>;
};
type Emit = (event: string, data: string) => void;
interface CollaboratorShape {
    id: string;
    socketId?: string;
    username: string;
    color?: {
        background: string;
        stroke: string;
    };
    pointer?: {
        x: number;
        y: number;
        tool: string;
    };
    button?: string;
    selectedElementIds?: Record<string, boolean>;
    avatarUrl?: string;
}
/** True if persist/load callbacks have been set (e.g. by app or registerFileStorage). */
export declare function hasPersistenceConfigured(): boolean;
export declare function setPersistCallback(cb: (roomId: string, doc: RoomDocument) => void): void;
export declare function setLoadCallback(cb: (roomId: string) => RoomDocument | null): void;
/** Set initial document for a room before the first join. Cleared after getOrCreateRoom uses it. */
export declare function setPendingInitialDoc(roomId: string, doc: RoomDocument): void;
type OnLeaveResult = void | {
    closeRoom: true;
};
/** Called when a user leaves a room. Return { closeRoom: true } to broadcast host_left and delete room (e.g. local host left). */
export declare function setOnLeaveCallback(cb: (roomId: string, userId: string) => OnLeaveResult): void;
/** Remove room from in-memory state (e.g. when deleting persisted room). */
export declare function deleteRoomData(roomId: string): void;
export declare function applyElements(roomId: string, userId: string, elements: readonly ElementLike[]): void;
/** Merge incoming files into room, persist, and broadcast to all clients so peers get images. */
export declare function applyFiles(roomId: string, userId: string, files: Readonly<Record<string, {
    mimeType: string;
    id: string;
    dataURL: string;
    created?: number;
    lastRetrieved?: number;
}>>): void;
export declare function broadcastAwareness(roomId: string, userId: string, awareness: AwarenessUpdate): void;
export declare function joinRoom(roomId: string, username: string, emit: Emit, opts?: {
    color?: {
        background: string;
        stroke: string;
    };
}): {
    userId: string;
    document: {
        elements: ElementLike[];
        files: Record<string, unknown>;
    };
    collaborators: Record<string, CollaboratorShape>;
};
export declare function updateCollaborator(roomId: string, userId: string, updates: {
    username?: string;
    color?: {
        background: string;
        stroke: string;
    };
    avatarUrl?: string;
}): void;
/** Update who a user is following; notify affected leaders of their followedBy set. */
export declare function setFollowState(roomId: string, userId: string, followingUserId: string | null): void;
export declare function broadcastViewport(roomId: string, userId: string, sceneBounds: SceneBounds): void;
export declare function roomExists(roomId: string): boolean;
export declare function getRoomDocument(roomId: string): {
    elements: ElementLike[];
    files: Record<string, unknown>;
} | null;
export declare function leaveRoom(roomId: string, userId: string): void;
export declare function broadcastCollaboratorJoined(roomId: string, userId: string, collaborator: CollaboratorShape): void;
export {};
