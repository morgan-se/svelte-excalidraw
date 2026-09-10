/**
 * Throttled/debounced push pipeline for elements, files, awareness, viewport.
 * Element push is gated in the Core by scene version.
 */
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ExcalidrawMultiplayerAdapter, AwarenessUpdate, SceneBounds } from "../types.js";
export declare const ELEMENT_THROTTLE_MS = 40;
export declare const AWARENESS_THROTTLE_MS = 50;
export declare const VIEWPORT_THROTTLE_MS = 40;
export declare const FILE_PUSH_DEBOUNCE_MS = 400;
export interface CreateSyncPipelineOptions {
    adapter: ExcalidrawMultiplayerAdapter;
}
export declare function createSyncPipeline(opts: CreateSyncPipelineOptions): {
    handleElementsChange: (roomId: string, userId: string, elements: readonly ExcalidrawElement[]) => void;
    handleFilesChange: (roomId: string, userId: string, files: BinaryFiles) => void;
    handlePointerUpdate: (roomId: string, userId: string, awareness: AwarenessUpdate) => void;
    handleViewportChange: (roomId: string, userId: string, sceneBounds: SceneBounds) => void;
    cleanup: () => void;
};
