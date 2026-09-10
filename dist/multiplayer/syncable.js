/**
 * Syncable elements filter for multiplayer.
 * We only send elements that (a) aren't invisibly tiny, (b) if deleted, were deleted recently
 * so other clients can remove them. Matches Excalidraw app logic; package doesn't export it.
 */
import { isInvisiblySmallElement } from "@excalidraw/excalidraw";
/** Deleted elements older than this are not synced (everyone has already removed them). */
export const DELETED_ELEMENT_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24h
export function isSyncableElement(element) {
    if (element.isDeleted) {
        return element.updated > Date.now() - DELETED_ELEMENT_TIMEOUT_MS;
    }
    return !isInvisiblySmallElement(element);
}
/**
 * Filter to elements we send over the wire (lean payload).
 * Use when building the update to push to the server / other clients.
 */
export function getSyncableElements(elements) {
    return elements.filter(isSyncableElement);
}
