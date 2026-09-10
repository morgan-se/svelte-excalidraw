import type { RoomUserInfo } from "./multiplayer/types.js";
import type { ExcalidrawMultiplayerAdapter } from "./multiplayer/types.js";
interface Props {
    roomId: string;
    userInfo: RoomUserInfo;
    /** Adapter for the backend. Use createDefaultAdapter({ streamUrl: (roomId) => `/your/path/${roomId}` }) with +server.ts next to the room +page. */
    adapter: ExcalidrawMultiplayerAdapter;
    theme?: "light" | "dark";
    UIOptions?: import("@excalidraw/excalidraw/types").AppProps["UIOptions"];
    /** When true, receive updates and show collaborators but do not push edits (view-only). */
    viewOnly?: boolean;
    /** Called when join fails (e.g. 403). Use to show "Access denied" and link. */
    onJoinError?: (error: unknown) => void;
}
declare const ExcalidrawMultiplayer: import("svelte").Component<Props, {}, "">;
type ExcalidrawMultiplayer = ReturnType<typeof ExcalidrawMultiplayer>;
export default ExcalidrawMultiplayer;
