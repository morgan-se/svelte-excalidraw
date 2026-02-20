<script lang="ts">
	import { browser } from "$app/environment";
	import type { RoomUserInfo } from "./multiplayer/types.js";
	import type { ExcalidrawMultiplayerAdapter } from "./multiplayer/types.js";

	interface Props {
		roomId: string;
		userInfo: RoomUserInfo;
		/** Adapter for the backend. Use createDefaultAdapter({ streamUrl: (roomId) => `/your/path/${roomId}` }) with +server.ts next to the room +page. */
		adapter: ExcalidrawMultiplayerAdapter;
		theme?: "light" | "dark";
		UIOptions?: import("@excalidraw/excalidraw/types").AppProps["UIOptions"];
		/** When true, receive updates and show collaborators but do not push edits (view-only). */
		viewOnly?: boolean;
		/** Called when join fails (e.g. 403). Use to show "Access denied" and link. */
		onJoinError?: (error: unknown) => void;
	}

	let { roomId, userInfo, adapter, theme, UIOptions, viewOnly, onJoinError }: Props = $props();
</script>

<div class="excalidraw-multiplayer-root">
	{#if !browser}
		<div class="excalidraw-multiplayer-loading">Loading…</div>
	{:else}
		{#await import("./ExcalidrawMultiplayerCore.svelte")}
			<div class="excalidraw-multiplayer-loading">Loading…</div>
		{:then m}
			{@const ExcalidrawMultiplayerCore = m.default}
			<ExcalidrawMultiplayerCore
				{roomId}
				{userInfo}
				{adapter}
				{theme}
				{UIOptions}
				{viewOnly}
				{onJoinError}
			/>
		{/await}
	{/if}
</div>

<style>
	.excalidraw-multiplayer-root {
		/* Works by default in any app: no parent height required. */
		min-height: 60vh;
		height: 100%;
	}
	.excalidraw-multiplayer-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		min-height: 300px;
		color: #666;
	}
</style>
