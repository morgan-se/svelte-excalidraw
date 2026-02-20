/**
 * Client-only localStorage (key: svex_client). Profile only: userKind, username, color.
 * Used as a cache for the name/color inputs; sessionUpdateProfile syncs these to the server session.
 * Workspace list, ephemeral list, and grants are never stored here — they come only from the server
 * (layout load → data.session) and are authoritative on the server.
 */
import { writable } from "svelte/store";
import type { UserKind } from "$lib/core/types/session-types.js";

const KEY = "svex_client";

export interface ClientState {
	userKind: UserKind;
	username?: string;
	color?: string;
}

const DEFAULT: ClientState = {
	userKind: "guest",
};

function load(): ClientState {
	if (typeof localStorage === "undefined") return { ...DEFAULT };
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return { ...DEFAULT };
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		const userKind =
			parsed.userKind === "trusted" || parsed.userKind === "admin"
				? parsed.userKind
				: "guest";
		return {
			userKind,
			username:
				typeof parsed.username === "string" && parsed.username.trim()
					? parsed.username.trim()
					: undefined,
			color:
				typeof parsed.color === "string" && parsed.color.trim()
					? parsed.color.trim()
					: undefined,
		};
	} catch {
		return { ...DEFAULT };
	}
}

function save(state: ClientState): void {
	try {
		localStorage.setItem(KEY, JSON.stringify(state));
	} catch {}
}

export function getClientState(): ClientState {
	return load();
}

export function updateClientState(partial: Partial<ClientState>): ClientState {
	const current = load();
	const next: ClientState = {
		userKind: partial.userKind ?? current.userKind,
		username: partial.username !== undefined ? partial.username : current.username,
		color: partial.color !== undefined ? partial.color : current.color,
	};
	save(next);
	return next;
}

export function getProfile(): { username?: string; color?: string } {
	const state = load();
	return { username: state.username, color: state.color };
}

export function setProfile(partial: { username?: string; color?: string }): void {
	const next = updateClientState(partial);
	profileStore.set({ username: next.username, color: next.color });
}

/** Clear profile from localStorage (e.g. on logout). Next load will get a fresh random name/color. */
export function clearProfile(): void {
	updateClientState({ username: "", color: "" });
	profileStore.set({ username: undefined, color: undefined });
}

/** Reactive store for profile; subscribe to get live updates when UserProfileWidget or setProfile changes. */
export const profileStore = writable<{ username?: string; color?: string }>(getProfile());
