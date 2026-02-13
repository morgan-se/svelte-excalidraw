<script lang="ts">
	import { browser } from "$app/environment";
	import { setContext } from "svelte";
	import { getRandomUsername } from "@excalidraw/random-username";
	import type { Snippet } from "svelte";
	import type { RoomUserInfo } from "svelte-excalidraw";
	import { MULTIPLAYER_USER_CONTEXT_KEY } from "./user-context.js";

	/**
	 * Collaborator cursor colors: open-color palette (same as Excalidraw element colors).
	 * Index 2 (vivid shade) from each hue. See excalidraw/packages/common/src/colors.ts
	 */
	const COLLABORATOR_COLORS = [
		"#3bc9db", // cyan
		"#4dabf7", // blue
		"#9775fa", // violet
		"#da77f2", // grape
		"#f783ac", // pink
		"#69db7c", // green
		"#38d9a9", // teal
		"#ffd43b", // yellow
		"#ffa94d", // orange
		"#ff8787", // red
	] as const;

	function collaboratorColorToShape(hex: string): {
		background: string;
		stroke: string;
	} {
		return { background: hex, stroke: hex };
	}

	interface Props {
		storageKey?: string;
		children: Snippet;
	}

	let { storageKey = "excalidraw-multiplayer-user", children }: Props =
		$props();

	let userInfo = $state<RoomUserInfo | null>(null);
	let hydrated = $state(false);

	function loadStoredUser() {
		if (!browser) return;
		try {
			const raw = sessionStorage.getItem(storageKey);
			if (raw) {
				const parsed = JSON.parse(raw) as {
					username?: string;
					color?: string;
				};
				const username = parsed?.username?.trim();
				const hex = parsed?.color;
				if (
					username &&
					hex &&
					COLLABORATOR_COLORS.includes(
						hex as (typeof COLLABORATOR_COLORS)[number],
					)
				) {
					userInfo = {
						username,
						color: collaboratorColorToShape(hex),
					};
					return;
				}
			}
			const defaultColor = collaboratorColorToShape(
				COLLABORATOR_COLORS[0],
			);
			userInfo = {
				username: getRandomUsername(),
				color: defaultColor,
			};
			sessionStorage.setItem(
				storageKey,
				JSON.stringify({
					username: userInfo.username,
					color: COLLABORATOR_COLORS[0],
				}),
			);
		} catch {
			userInfo = {
				username: getRandomUsername(),
				color: collaboratorColorToShape(COLLABORATOR_COLORS[0]),
			};
		}
	}

	function updateUser(info: RoomUserInfo) {
		userInfo = { username: info.username.trim(), color: info.color };
		if (browser && info.color) {
			sessionStorage.setItem(
				storageKey,
				JSON.stringify({
					username: userInfo!.username,
					color: info.color.background,
				}),
			);
		}
	}

	$effect(() => {
		if (browser && !hydrated) {
			hydrated = true;
			loadStoredUser();
		}
	});

	setContext(MULTIPLAYER_USER_CONTEXT_KEY, {
		get userInfo() {
			return userInfo;
		},
		updateUser,
		colors: COLLABORATOR_COLORS,
		colorToShape: collaboratorColorToShape,
	});
</script>

{@render children()}
