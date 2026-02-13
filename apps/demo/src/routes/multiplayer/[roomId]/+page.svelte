<script lang="ts">
	import { page } from "$app/state";
	import { ExcalidrawMultiplayer, createDefaultAdapter } from "svelte-excalidraw";
	import { getMultiplayerUser } from "$lib/multiplayer/user-context.js";

	const adapter = createDefaultAdapter({
		streamUrl: (roomId) => `/multiplayer/${roomId}`,
	});
	const roomId = $derived(page.params.roomId!);
	const user = getMultiplayerUser();
	const userInfo = $derived(user.userInfo);
</script>

<svelte:head>
	<title>Excalidraw multiplayer – {roomId}</title>
</svelte:head>

<div class="room-page">
	{#if userInfo != null}
		<ExcalidrawMultiplayer {adapter} {roomId} {userInfo} />
	{/if}
</div>

<style>
	.room-page {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}
</style>
