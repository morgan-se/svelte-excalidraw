import * as v from "valibot";
import { command } from "$app/server";
import { elementsArraySchema } from "./element-schema.js";
import {
	applyElements,
	applyFiles,
	updateCollaborator,
	broadcastAwareness,
	broadcastViewport,
	setFollowState,
} from "./server/excalidraw-room-state.js";

const roomUserId = {
	roomId: v.pipe(v.string(), v.minLength(1)),
	userId: v.pipe(v.string(), v.minLength(1)),
};

const pushElementsSchema = v.object({
	...roomUserId,
	elements: elementsArraySchema,
});

const fileEntrySchema = v.object({
	mimeType: v.string(),
	id: v.string(),
	dataURL: v.string(),
	created: v.optional(v.number()),
	lastRetrieved: v.optional(v.number()),
});

const pushFilesSchema = v.object({
	...roomUserId,
	files: v.record(v.string(), fileEntrySchema),
});

const pushViewportSchema = v.object({
	...roomUserId,
	sceneBounds: v.tuple([v.number(), v.number(), v.number(), v.number()]),
});

const pushFollowStateSchema = v.object({
	...roomUserId,
	followingUserId: v.nullable(v.string()),
});

const updateUserInfoSchema = v.object({
	...roomUserId,
	userInfo: v.object({
		username: v.string(),
		color: v.optional(v.object({ background: v.string(), stroke: v.string() })),
		avatarUrl: v.optional(v.string()),
	}),
});

const pushAwarenessSchema = v.object({
	...roomUserId,
	awareness: v.object({
		pointer: v.object({
			x: v.number(),
			y: v.number(),
			tool: v.picklist(["pointer", "laser"]),
		}),
		button: v.optional(v.picklist(["up", "down"])),
		selectedElementIds: v.optional(v.record(v.string(), v.literal(true))),
	}),
});

export const pushElements = command(pushElementsSchema, async (payload) => {
	applyElements(payload.roomId, payload.userId, payload.elements);
});

export const pushFiles = command(pushFilesSchema, async (payload) => {
	applyFiles(payload.roomId, payload.userId, payload.files);
});

export const pushViewport = command(pushViewportSchema, async (payload) => {
	broadcastViewport(payload.roomId, payload.userId, payload.sceneBounds);
});

export const pushFollowState = command(pushFollowStateSchema, async (payload) => {
	setFollowState(payload.roomId, payload.userId, payload.followingUserId);
});

export const updateUserInfo = command(updateUserInfoSchema, async (payload) => {
	updateCollaborator(payload.roomId, payload.userId, payload.userInfo);
});

export const pushAwareness = command(pushAwarenessSchema, async (payload) => {
	broadcastAwareness(payload.roomId, payload.userId, payload.awareness);
});
