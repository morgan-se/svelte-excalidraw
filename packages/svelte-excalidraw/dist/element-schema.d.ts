/**
 * Valibot schema for Excalidraw elements (sync payload validation).
 * Mirrors @excalidraw/element types; no runtime dependency on excalidraw.
 * Uses looseObject to validate required fields while preserving unknown keys.
 */
import * as v from "valibot";
/** Validates element shape: id + type required, other keys preserved. */
export declare const elementSchema: v.LooseObjectSchema<{
    readonly id: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MinLengthAction<string, 1, undefined>]>;
    readonly type: v.PicklistSchema<readonly ["selection", "rectangle", "diamond", "ellipse", "text", "line", "arrow", "freedraw", "image", "frame", "magicframe", "iframe", "embeddable"], undefined>;
    readonly version: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
    readonly versionNonce: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
    readonly isDeleted: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
}, undefined>;
export declare const elementsArraySchema: v.ArraySchema<v.LooseObjectSchema<{
    readonly id: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MinLengthAction<string, 1, undefined>]>;
    readonly type: v.PicklistSchema<readonly ["selection", "rectangle", "diamond", "ellipse", "text", "line", "arrow", "freedraw", "image", "frame", "magicframe", "iframe", "embeddable"], undefined>;
    readonly version: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
    readonly versionNonce: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
    readonly isDeleted: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
}, undefined>, undefined>;
