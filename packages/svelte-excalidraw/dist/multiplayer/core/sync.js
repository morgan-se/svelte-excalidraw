/**
 * Throttled/debounced push pipeline for elements, files, awareness, viewport.
 * Element push is gated in the Core by scene version.
 */
import { getSyncableElements } from "../syncable.js";
import { serializeFilesAsync } from "./serialization.js";
export const ELEMENT_THROTTLE_MS = 40;
export const AWARENESS_THROTTLE_MS = 50;
export const VIEWPORT_THROTTLE_MS = 40;
export const FILE_PUSH_DEBOUNCE_MS = 400;
export function createSyncPipeline(opts) {
    const { adapter } = opts;
    let lastElementPushTime = 0;
    let elementPushScheduled = null;
    let pendingElements = null;
    let lastAwarenessTime = 0;
    let lastViewportTime = 0;
    let viewportPushScheduled = null;
    let pendingViewport = null;
    let filesPushScheduled = null;
    let pendingFiles = null;
    function handleElementsChange(roomId, userId, elements) {
        pendingElements = elements;
        const now = Date.now();
        const elapsed = now - lastElementPushTime;
        const run = () => {
            elementPushScheduled = null;
            lastElementPushTime = Date.now();
            const toSend = pendingElements;
            pendingElements = null;
            if (toSend) {
                const syncable = getSyncableElements(toSend);
                if (syncable.length > 0)
                    adapter.push(roomId, userId, { type: "elements", elements: syncable });
            }
        };
        if (elapsed >= ELEMENT_THROTTLE_MS) {
            run();
        }
        else if (elementPushScheduled == null) {
            elementPushScheduled = setTimeout(run, ELEMENT_THROTTLE_MS - elapsed);
        }
    }
    function handleFilesChange(roomId, userId, files) {
        pendingFiles = files;
        if (filesPushScheduled == null) {
            filesPushScheduled = setTimeout(async () => {
                filesPushScheduled = null;
                const toSend = pendingFiles;
                pendingFiles = null;
                if (toSend) {
                    const serialized = await serializeFilesAsync(toSend);
                    if (Object.keys(serialized).length > 0)
                        await adapter.push(roomId, userId, { type: "files", files: serialized });
                }
            }, FILE_PUSH_DEBOUNCE_MS);
        }
    }
    function handlePointerUpdate(roomId, userId, awareness) {
        const now = Date.now();
        if (now - lastAwarenessTime < AWARENESS_THROTTLE_MS)
            return;
        lastAwarenessTime = now;
        adapter.push(roomId, userId, { type: "awareness", awareness });
    }
    function handleViewportChange(roomId, userId, sceneBounds) {
        pendingViewport = sceneBounds;
        const now = Date.now();
        const elapsed = now - lastViewportTime;
        const run = () => {
            viewportPushScheduled = null;
            lastViewportTime = Date.now();
            const toSend = pendingViewport;
            pendingViewport = null;
            if (toSend)
                adapter.push(roomId, userId, { type: "viewport", sceneBounds: toSend });
        };
        if (elapsed >= VIEWPORT_THROTTLE_MS) {
            run();
        }
        else if (viewportPushScheduled == null) {
            viewportPushScheduled = setTimeout(run, VIEWPORT_THROTTLE_MS - elapsed);
        }
    }
    function cleanup() {
        if (elementPushScheduled)
            clearTimeout(elementPushScheduled);
        if (filesPushScheduled)
            clearTimeout(filesPushScheduled);
        if (viewportPushScheduled)
            clearTimeout(viewportPushScheduled);
    }
    return {
        handleElementsChange,
        handleFilesChange,
        handlePointerUpdate,
        handleViewportChange,
        cleanup,
    };
}
