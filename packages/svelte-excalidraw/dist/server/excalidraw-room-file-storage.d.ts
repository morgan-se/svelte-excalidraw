import { type RoomDocument } from "./excalidraw-room-state.js";
/** Delete persisted room (entire dir). */
export declare function deleteRoomFile(roomId: string): Promise<void>;
/** Load room from disk (split layout). Use when room is not in memory. */
export declare function loadRoomFromDisk(roomId: string): RoomDocument | null;
/** Export room as single payload (elements + files with dataURL). From memory or disk. */
export declare function exportRoomToSinglePayload(roomId: string): RoomDocument | null;
/** Import room from single payload (e.g. backup). Writes in split layout. */
export declare function importRoomFromSinglePayload(roomId: string, doc: RoomDocument): Promise<void>;
export declare function registerFileStorage(): void;
