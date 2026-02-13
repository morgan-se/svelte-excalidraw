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
	}

	let { roomId, userInfo, adapter, theme, UIOptions }: Props = $props();
</script>

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
		/>
	{/await}
{/if}

<style>
	.excalidraw-multiplayer-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		min-height: 300px;
		color: #666;
	}
</style>
