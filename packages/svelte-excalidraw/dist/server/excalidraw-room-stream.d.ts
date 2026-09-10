import type { RoomDocument } from "./excalidraw-room-state.js";
export interface ExcalidrawStreamJoinOptions {
    roomId: string;
    username: string;
    color?: {
        background: string;
        stroke: string;
    };
    /** When provided, used as initial room document for this room (e.g. host uploading file-system doc). */
    initialDocument?: RoomDocument;
    /** Called after join; e.g. for app to set room metadata (e.g. host userId for local rooms). */
    onJoin?: (roomId: string, userId: string) => void;
    /** When false, room state is in-memory only (cleared when last peer leaves). Default true = file storage. */
    persist?: boolean;
}
/**
 * Returns the SSE response for one join. Use from your POST after auth and parsing.
 */
export declare function handleExcalidrawStream(_request: Request, options: ExcalidrawStreamJoinOptions): Promise<Response>;
