<script lang="ts">
	import { browser } from "$app/environment";
	import { getRoomScene, getWorkspaceWhiteboardScene } from "$lib/svex.remote.js";

	type SceneDoc = { elements: unknown[]; files: Record<string, unknown> };

	let {
		workspaceId = undefined,
		whiteboardId = undefined,
		collection = undefined,
		ephemeralId = undefined,
		getScene = undefined,
		aspectRatio = "16/9",
		size = "default",
	} = $props();
	let svgHtml = $state<string>("");

	$effect(() => {
		if (!browser) return;
		let cancelled = false;
		(async () => {
			try {
				const { exportToSvg } = await import("svelte-excalidraw/export");
				let doc: SceneDoc | null = null;
				if (getScene) {
					doc = await getScene();
				} else if (ephemeralId) {
					doc = await getRoomScene(ephemeralId);
				} else if (workspaceId && whiteboardId) {
					doc = await getWorkspaceWhiteboardScene({ workspaceId, whiteboardId, collection });
				}
				if (cancelled || !doc) return;
				const elements = Array.isArray(doc.elements)
					? doc.elements
					: [];
				if (elements.length === 0) return;
				const svg = await exportToSvg({
					elements: elements as Parameters<
						typeof exportToSvg
					>[0]["elements"],
					appState: {
						exportBackground: false,
						exportWithDarkMode: true,
					},
					files: (doc.files ?? {}) as Parameters<
						typeof exportToSvg
					>[0]["files"],
					exportPadding: 8,
				});
				if (!cancelled) svgHtml = svg.outerHTML;
			} catch {
				// ignore
			}
		})();
		return () => {
			cancelled = true;
		};
	});
</script>

<div
	class="hero"
	class:empty={!svgHtml}
	class:medium={size === "medium"}
	style="aspect-ratio: {aspectRatio};"
>
	{#if svgHtml}
		{@html svgHtml}
	{/if}
</div>

<style>
	.hero {
		width: 100%;
		border-radius: 8px 8px 0 0;
		overflow: hidden;
		background: var(--border);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.hero :global(svg) {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
	.hero.empty {
		opacity: 0.5;
		min-height: 6rem;
	}
	.hero.medium {
		max-height: 10rem;
		min-height: 5rem;
	}
</style>
