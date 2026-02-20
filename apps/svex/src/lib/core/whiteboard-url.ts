/** Encode a path segment for use in URLs (handles &, º, spaces, etc.). */
function enc(s: string): string {
	return encodeURIComponent(s);
}

/**
 * Build clean whiteboard URLs (no encoded slashes).
 * roomId: "whiteboardId" (root) or "collection/whiteboardId" (in collection).
 * Path segments are encoded to avoid URI malformed errors (e.g. &, º, spaces).
 */
export function whiteboardUrl(workspaceId: string, roomId: string): string {
	if (roomId.includes("/")) {
		const [collection, wbId] = roomId.split("/");
		return `/whiteboard/${enc(workspaceId)}/${enc(collection)}/${enc(wbId)}`;
	}
	return `/whiteboard/${enc(workspaceId)}/${enc(roomId)}`;
}

export function whiteboardLocalUrl(roomId: string): string {
	if (roomId.includes("/")) {
		const [collection, wbId] = roomId.split("/");
		return `/whiteboard/local/${enc(collection)}/${enc(wbId)}`;
	}
	return `/whiteboard/local/${enc(roomId)}`;
}

/** Same as whiteboardUrl - workspaceId is remote-{id} for local guest links. */
export const whiteboardRemoteUrl = whiteboardUrl;
