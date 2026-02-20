/**
 * Hold local host session (dir handle + doc + filename) in memory across navigation.
 * Used when opening a whiteboard from a local workspace so we can write back to the right file.
 */
import type { ExcalidrawDoc } from "../fs-storage.js";

let session: {
	roomId: string;
	doc: ExcalidrawDoc;
	dirHandle: FileSystemDirectoryHandle;
	/** Base name of the .excalidraw file (e.g. "scene", "board1") */
	filenameBase: string;
} | null = null;

export function setLocalHostSession(
	roomId: string,
	doc: ExcalidrawDoc,
	dirHandle: FileSystemDirectoryHandle,
	filenameBase: string = "scene",
): void {
	session = { roomId, doc, dirHandle, filenameBase };
}

export function getLocalHostSession(roomId: string): {
	doc: ExcalidrawDoc;
	dirHandle: FileSystemDirectoryHandle;
	filenameBase: string;
} | null {
	if (!session || session.roomId !== roomId) return null;
	return {
		doc: session.doc,
		dirHandle: session.dirHandle,
		filenameBase: session.filenameBase,
	};
}

export function clearLocalHostSession(roomId: string): void {
	if (session?.roomId === roomId) session = null;
}
