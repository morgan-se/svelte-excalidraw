<script lang="ts">
	import { page } from "$app/state";
	import ExcalidrawMultiplayer from "$lib/ExcalidrawMultiplayer.svelte";
	import { createIframeDemoAdapter } from "../iframe-demo-adapter.js";

	const slot = $derived(parseInt(page.url.searchParams.get("slot") ?? "0", 10));
	// Colors from multiplayer COLLABORATOR_COLORS (blue, red)
	const userInfo = $derived(
		slot === 1
			? { username: "Bottom", color: { background: "#ff8787", stroke: "#ff8787" } }
			: { username: "Top", color: { background: "#4dabf7", stroke: "#4dabf7" } },
	);
	const adapter = createIframeDemoAdapter();
	const roomId = "demo";
</script>

<svelte:head>
	<title>Canvas {slot === 0 ? "Top" : "Bottom"}</title>
</svelte:head>

<div class="embed-page">
	<ExcalidrawMultiplayer {adapter} {roomId} {userInfo} />
</div>

<style>
	.embed-page {
		width: 100%;
		height: 100%;
		min-height: 0;
	}
</style>
