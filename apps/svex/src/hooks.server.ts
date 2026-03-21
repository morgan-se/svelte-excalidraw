import type { Handle } from "@sveltejs/kit";
import { getDb } from "$lib/server/storage/db.js";
import { validatePepperOrExit } from "$lib/server/auth/token-utils.js";
import {
	setPersistCallback,
	setLoadCallback,
	setOnLeaveCallback,
} from "svelte-excalidraw/server/state";
import { loadRoom, createPersistCallback } from "$lib/server/storage/room-storage.js";
import { getConfig } from "$lib/server/config.js";
import { onUserLeft } from "$lib/server/room-ttl.js";
import { runLifecycleCleanup } from "$lib/server/lifecycle-cleanup.js";

// Persist: only ephemeral and forever; touch TTL and save doc + metadata
setPersistCallback(createPersistCallback());

// Load: restore from disk and register metadata for TTL
setLoadCallback((roomId: string) => {
	return loadRoom(roomId);
});

// When a user leaves: for local rooms, if host left, room is already deleted by room-ttl
setOnLeaveCallback(onUserLeft);

getDb(); // Initialize DB at startup
validatePepperOrExit(); // Resolve pepper (DB → generate); in production exit if too short
runLifecycleCleanup();

export const handle: Handle = async ({ event, resolve }) => {
	return resolve(event);
};

const cleanupIntervalMs = getConfig().storage.cleanupIntervalMinutes * 60 * 1000;
setInterval(runLifecycleCleanup, cleanupIntervalMs);
