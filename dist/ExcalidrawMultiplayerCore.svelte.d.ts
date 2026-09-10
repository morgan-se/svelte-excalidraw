import type { ExcalidrawMultiplayerAdapter, RoomUserInfo } from "./multiplayer/types.js";
interface Props {
    roomId: string;
    userInfo: RoomUserInfo;
    adapter: ExcalidrawMultiplayerAdapter;
    theme?: "light" | "dark";
    UIOptions?: import("@excalidraw/excalidraw/types").AppProps["UIOptions"];
    /** When true, receive updates and show collaborators but do not push edits (view-only). */
    viewOnly?: boolean;
    /** Called when join fails (e.g. 403). Use to show "Access denied" and link. */
    onJoinError?: (error: unknown) => void;
}
declare const ExcalidrawMultiplayerCore: import("svelte").Component<Props, {}, "">;
type ExcalidrawMultiplayerCore = ReturnType<typeof ExcalidrawMultiplayerCore>;
export default ExcalidrawMultiplayerCore;
