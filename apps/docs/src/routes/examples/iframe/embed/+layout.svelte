<script lang="ts">
	import type { Snippet } from "svelte";
	const { children }: { children: Snippet } = $props();
</script>

<div class="embed-layout">
	{@render children()}
</div>

<style>
	.embed-layout {
		width: 100%;
		height: 100%;
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}
</style>
