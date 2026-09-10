/**
 * Multiplayer adapter types for svelte-excalidraw.
 * Any backend (default SvelteKit SSE + Remote, Durable Objects, ZeroSync, Express WS, etc.)
 * implements this interface so the same ExcalidrawMultiplayer component works everywhere.
 */

import type { BinaryFiles, Collaborator } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

/** Full document for bootstrap / initial load. Always include files (use {} if none). */
export interface ExcalidrawDocument {
	elements: readonly ExcalidrawElement[];
	files: BinaryFiles | Record<string, SerializedFile>;
}

/** User info when joining a room */
export interface RoomUserInfo {
	username: string;
	/** Optional color/avatar; adapter can pass through to Collaborator */
	color?: { background: string; stroke: string };
	avatarUrl?: string;
}

/** Awareness payload: pointer (cursor), button, selected ids. Sent frequently. */
export interface AwarenessUpdate {
	pointer: { x: number; y: number; tool: "pointer" | "laser" };
	button?: "up" | "down";
	selectedElementIds?: Readonly<Record<string, true>>;
}

/** Serialized file for wire/storage: dataURL is base64 data URL string */
export type SerializedFile = { mimeType: string; id: string; dataURL: string; created?: number; lastRetrieved?: number };
/** Scene bounds for follow mode: [x1, y1, x2, y2] in scene coords */
export type SceneBounds = [number, number, number, number];

/** Typed payload for adapter.push(). Use switch (payload.type) in adapters. */
export type RoomPush =
	| { type: "elements"; elements: readonly ExcalidrawElement[] }
	| { type: "files"; files: Readonly<Record<string, SerializedFile>> }
	| { type: "viewport"; sceneBounds: SceneBounds }
	| { type: "followState"; followingUserId: string | null }
	| { type: "userInfo"; userInfo: RoomUserInfo }
	| { type: "awareness"; awareness: AwarenessUpdate };

/** Events the client receives over the room subscription */
export type RoomEvent =
	| { type: "init"; document: ExcalidrawDocument; userId?: string; collaborators?: Readonly<Record<string, Collaborator>> }
	| { type: "elements"; elements: readonly ExcalidrawElement[] }
	| { type: "files"; files: Readonly<Record<string, SerializedFile>> }
	| { type: "viewport"; userId: string; sceneBounds: SceneBounds }
	| { type: "followed_by"; followedBy: string[] }
	| { type: "awareness"; userId: string; awareness: AwarenessUpdate }
	| { type: "collaborator_joined"; collaborator: Collaborator }
	| { type: "collaborator_updated"; collaborator: Collaborator }
	| { type: "collaborator_left"; userId: string }
	| { type: "host_left" }
	| { type: "sync"; userId: string; collaborators: Readonly<Record<string, Collaborator>> };

/** Result of joining a room: your id and a stream of room events */
export interface RoomConnection {
	userId: string;
	/** Async iterable of room events (init, elements, awareness, join/leave). */
	subscribe(): AsyncIterable<RoomEvent>;
	/** Call when leaving the room (cleanup). */
	leave(): void;
}

/**
 * Multiplayer adapter: one contract for default or custom backends.
 * - join: connect to a room, get userId and event stream. Server must send an init event with the document.
 * - push: single typed channel; use switch (payload.type) to handle elements, files, viewport, followState, userInfo, awareness.
 */
export interface ExcalidrawMultiplayerAdapter {
	join(roomId: string, userInfo: RoomUserInfo): Promise<RoomConnection>;
	push(roomId: string, userId: string, payload: RoomPush): Promise<void>;
}
