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
/**
 * Start connection: join, then subscribe loop. Initial document comes only from the stream's init event.
 * Cleanup is delivered via onReady(cleanup); nothing is returned.
 */
export declare function startConnection(opts: StartConnectionOptions): Promise<void>;
