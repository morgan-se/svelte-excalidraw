<script lang="ts">
    import { browser } from "$app/environment";
	import { onMount } from "svelte";
	import { Excalidraw } from "svelte-excalidraw";

	interface Props {
		mermaid: string;
	}

	let { mermaid }: Props = $props();
	let initialData = $state<{ elements: unknown[]; files?: Record<string, unknown> } | null>(null);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			if (!browser) return;
			const { convertToExcalidrawElements } = await import("@excalidraw/excalidraw");
			const { parseMermaidToExcalidraw } = await import("@excalidraw/mermaid-to-excalidraw");
			const { elements, files } = await parseMermaidToExcalidraw(mermaid);
			const converted = convertToExcalidrawElements(elements, { regenerateIds: true });
			initialData = { elements: converted, files };
		} catch (e) {
			error = e instanceof Error ? e.message : "Failed to parse mermaid";
		}
	});
</script>

{#if error}
	<p class="flowchart-error">{error}</p>
{:else if initialData}
	<div class="flowchart-wrap">
		<Excalidraw
			initialData={initialData}
			theme="dark"
			viewModeEnabled={true}
			UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false } }}
		/>
	</div>
{/if}

<style>
	.flowchart-wrap {
		min-height: 280px;
		height: 280px;
		margin: 1rem 0;
		border: 1px solid var(--border, #27272a);
		border-radius: 8px;
		overflow: hidden;
	}
	.flowchart-wrap :global(.excalidraw) {
		height: 100%;
	}
	.flowchart-error {
		color: var(--muted, #a1a1aa);
		font-size: 0.9rem;
		margin: 1rem 0;
	}
</style>
