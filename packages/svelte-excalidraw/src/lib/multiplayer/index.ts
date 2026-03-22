// export {
// 	getSyncableElements,
// 	isSyncableElement,
// 	DELETED_ELEMENT_TIMEOUT_MS,
// } from "./syncable.js";
export type {
	AwarenessUpdate,
	ExcalidrawDocument,
	ExcalidrawMultiplayerAdapter,
	RoomConnection,
	RoomEvent,
	RoomPush,
	RoomUserInfo,
} from "./types.js";
// createDefaultAdapter uses $app/server and must NOT be in the client bundle.
// Import it from "svelte-excalidraw/adapter" instead.
