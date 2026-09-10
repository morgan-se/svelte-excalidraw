/**
 * Collaborator map normalization and room-event application.
 */
import type { Collaborator } from "@excalidraw/excalidraw/types";
import type { RoomEvent } from "../types.js";
export declare function normalizeCollaborator(id: string, collaborator: Collaborator): Collaborator;
export type CollaboratorMap = Map<string, Collaborator>;
/** Apply a room event to a collaborator map; returns a new Map or the same if no change. */
export declare function applyCollaboratorEvent(current: CollaboratorMap, ev: RoomEvent): CollaboratorMap;
