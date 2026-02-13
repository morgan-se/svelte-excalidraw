<script lang="ts">
	import { page } from "$app/state";
	import type { Snippet } from "svelte";
	import MultiplayerUserProvider from "$lib/multiplayer/MultiplayerUserProvider.svelte";
	import MultiplayerUserBar from "$lib/multiplayer/MultiplayerUserBar.svelte";

	const { children }: { children: Snippet } = $props();

	const pathname = $derived(page.url.pathname);
	const inRoom = $derived(
		pathname !== "/multiplayer" && pathname.startsWith("/multiplayer/"),
	);
</script>

<MultiplayerUserProvider>
	<div class="multiplayer-layout">
		{#if inRoom}
			<MultiplayerUserBar backHref="/multiplayer" />
		{:else}
			<MultiplayerUserBar />
		{/if}
		<div class="multiplayer-outlet">
			{@render children()}
		</div>
	</div>
</MultiplayerUserProvider>

<style>
	.multiplayer-layout {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}
	.multiplayer-outlet {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
</style>
