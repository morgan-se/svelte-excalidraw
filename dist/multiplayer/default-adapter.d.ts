import type { ExcalidrawMultiplayerAdapter } from "./types.js";
export interface DefaultAdapterOptions {
    /** Full stream URL for each room. No magic: you choose the path (e.g. (roomId) => `/multiplayer/${roomId}` with +server.ts next to +page). */
    streamUrl: (roomId: string) => string;
}
export declare function createDefaultAdapter(options: DefaultAdapterOptions): ExcalidrawMultiplayerAdapter;
