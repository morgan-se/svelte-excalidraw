/**
 * Valibot schema for Excalidraw elements (sync payload validation).
 * Mirrors @excalidraw/element types; no runtime dependency on excalidraw.
 * Uses looseObject to validate required fields while preserving unknown keys.
 */
import * as v from "valibot";
/** Element types from @excalidraw/element/types ExcalidrawElementType */
const ELEMENT_TYPES = [
    "selection",
    "rectangle",
    "diamond",
    "ellipse",
    "text",
    "line",
    "arrow",
    "freedraw",
    "image",
    "frame",
    "magicframe",
    "iframe",
    "embeddable",
];
/** Validates element shape: id + type required, other keys preserved. */
export const elementSchema = v.looseObject({
    id: v.pipe(v.string(), v.minLength(1)),
    type: v.picklist(ELEMENT_TYPES),
    version: v.optional(v.number()),
    versionNonce: v.optional(v.number()),
    isDeleted: v.optional(v.boolean()),
});
export const elementsArraySchema = v.array(elementSchema);
