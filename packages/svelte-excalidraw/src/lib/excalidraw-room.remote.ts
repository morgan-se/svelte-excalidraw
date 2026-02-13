/**
 * Remote functions for the default Excalidraw multiplayer backend.
 * Server-only: no imports from @excalidraw so this module never loads browser-only code.
 */
import { query, command } from "$app/server";
import {
	applyElements,
	applyFiles,
	updateCollaborator,
	broadcastAwareness,
	broadcastViewport,
	setFollowState,
} from "./server/excalidraw-room-state.js";
import {
	listRoomsWithStats,
	deleteRoomFile,
} from "./server/excalidraw-room-file-storage.js";
import { deleteRoomData } from "./server/excalidraw-room-state.js";

export const listRooms = query("unchecked", async () => {
	return listRoomsWithStats();
});

export const deleteRoom = command("unchecked", async (roomId: string) => {
	deleteRoomData(roomId);
	await deleteRoomFile(roomId);
});

export const pushElements = command(
	"unchecked",
	async (payload: { roomId: string; userId: string; elements: readonly Record<string, unknown>[] }) => {
		applyElements(payload.roomId, payload.userId, payload.elements);
	},
);

export const pushFiles = command(
	"unchecked",
	async (payload: {
		roomId: string;
		userId: string;
		files: Record<string, { mimeType: string; id: string; dataURL: string; created?: number; lastRetrieved?: number }>;
	}) => {
		applyFiles(payload.roomId, payload.userId, payload.files);
	},
);

export const pushViewport = command(
	"unchecked",
	async (payload: {
		roomId: string;
		userId: string;
		sceneBounds: [number, number, number, number];
	}) => {
		broadcastViewport(payload.roomId, payload.userId, payload.sceneBounds);
	},
);

export const pushFollowState = command(
	"unchecked",
	async (payload: {
		roomId: string;
		userId: string;
		followingUserId: string | null;
	}) => {
		setFollowState(payload.roomId, payload.userId, payload.followingUserId);
	},
);

export const updateUserInfo = command(
	"unchecked",
	async (payload: {
		roomId: string;
		userId: string;
		userInfo: { username: string; color?: { background: string; stroke: string }; avatarUrl?: string };
	}) => {
		updateCollaborator(payload.roomId, payload.userId, payload.userInfo);
	},
);

export const pushAwareness = command(
	"unchecked",
	async (payload: {
		roomId: string;
		userId: string;
		awareness: { pointer: { x: number; y: number; tool: "pointer" | "laser" }; button?: "up" | "down"; selectedElementIds?: Readonly<Record<string, true>> };
	}) => {
		broadcastAwareness(payload.roomId, payload.userId, payload.awareness);
	},
);
