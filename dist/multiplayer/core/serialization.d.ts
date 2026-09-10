/**
 * File serialization for multiplayer sync.
 */
import type { BinaryFiles } from "@excalidraw/excalidraw/types";
import type { SerializedFile } from "../types.js";
/** Serialize BinaryFiles to wire format. Uses dataURL when string; converts Blob to dataURL async. */
export declare function serializeFilesAsync(files: BinaryFiles): Promise<Record<string, SerializedFile>>;
