/**
 * Demo: multiplayer user context (identity + persistence). Not part of the published lib.
 */
import { getContext } from "svelte";
import type { RoomUserInfo } from "$lib/multiplayer/types.js";

export const MULTIPLAYER_USER_CONTEXT_KEY = Symbol("multiplayerUser");

export interface MultiplayerUserContext {
	get userInfo(): RoomUserInfo | null;
	updateUser(info: RoomUserInfo): void;
	colors: readonly string[];
	colorToShape(hex: string): { background: string; stroke: string };
}

export function getMultiplayerUser(): MultiplayerUserContext {
	const ctx = getContext<MultiplayerUserContext | undefined>(MULTIPLAYER_USER_CONTEXT_KEY);
	if (!ctx) throw new Error("MultiplayerUserProvider not found.");
	return ctx;
}
