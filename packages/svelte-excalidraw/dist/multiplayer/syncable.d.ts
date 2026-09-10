import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
/** Deleted elements older than this are not synced (everyone has already removed them). */
export declare const DELETED_ELEMENT_TIMEOUT_MS: number;
export declare function isSyncableElement(element: ExcalidrawElement): boolean;
/**
 * Filter to elements we send over the wire (lean payload).
 * Use when building the update to push to the server / other clients.
 */
export declare function getSyncableElements(elements: readonly ExcalidrawElement[]): ExcalidrawElement[];
