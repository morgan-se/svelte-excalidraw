/**
 * Server-safe adapter entry point. Use this in code that may run on the server (e.g. SvelteKit SSR).
 * Re-exports only the default adapter and types; does NOT import @excalidraw/excalidraw or any
 * browser-only code. For ExcalidrawMultiplayer and exportToSvg, import from "svelte-excalidraw"
 * For ExcalidrawMultiplayer import from "svelte-excalidraw"; for exportToSvg use "svelte-excalidraw/export".
 */
export type {
	AwarenessUpdate,
	ExcalidrawDocument,
	ExcalidrawMultiplayerAdapter,
	RoomConnection,
	RoomEvent,
	RoomPush,
	RoomUserInfo,
} from "./multiplayer/types.js";
export {
	createDefaultAdapter,
	type DefaultAdapterOptions,
} from "./multiplayer/default-adapter.js";
