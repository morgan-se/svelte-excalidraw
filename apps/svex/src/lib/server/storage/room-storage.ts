/**
 * Re-exports from doc-storage. Room ids: workspaceId/docId, or id (ephemeral), or remote-* (local).
 */
export {
	loadRoom,
	saveRoom,
	deleteRoomFromDisk,
	createPersistCallback,
	readRoomMeta,
	readRoomMetaFull,
	listEphemeralIdsOnDisk,
} from "./doc-storage.js";
