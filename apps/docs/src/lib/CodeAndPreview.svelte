<script lang="ts">
	import type { Component } from 'svelte';
	import { getHighlightedCode } from '$lib/code-highlighter.js';

	/** Module that exports default (component) and source (raw string) */
	interface ExampleModule {
		default: Component;
		source: string;
	}

	interface Props {
		/** One import: the example module with .default and .source */
		example: ExampleModule;
		/** 'stacked' = code above preview (default). 'sideBySide' = code left, preview right. */
		layout?: "stacked" | "sideBySide";
		lang?: string;
	}

	let { example, layout = "stacked", lang = "svelte" }: Props = $props();
	const Comp = $derived(example.default);
	const { langClass, html } = $derived(getHighlightedCode(example.source, lang));
</script>

<div class="code-and-preview" class:side-by-side={layout === "sideBySide"}>
	<div class="code-wrap">
		<pre class="code language-{langClass}"><code class="language-{langClass}">{@html html}</code></pre>
	</div>
	<div class="preview">
		<Comp />
	</div>
</div>

<style>
	.code-and-preview {
		margin: 1rem 0;
		border: 1px solid var(--border, #27272a);
		border-radius: 8px;
		overflow: hidden;
	}
	.code-and-preview.side-by-side {
		display: flex;
		flex-direction: column;
		width: 100%;
	}
	@media (min-width: 768px) {
		.code-and-preview.side-by-side {
			flex-direction: row;
		}
		.code-and-preview.side-by-side .code-wrap {
			flex: 0 1 50%;
			min-width: 0;
			border-right: 1px solid var(--border, #27272a);
			min-height: 360px;
			max-height: 70vh;
			overflow: auto;
		}
		.code-and-preview.side-by-side .code-wrap .code {
			border-bottom: none;
			overflow: visible;
		}
		.code-and-preview.side-by-side .preview {
			flex: 1 1 0;
			min-width: 0;
			min-height: 360px;
			max-height: 70vh;
			overflow: auto;
		}
	}
	.code-wrap {
		display: block;
	}
	.code-and-preview .code {
		margin: 0;
		border-radius: 0;
		border-bottom: 1px solid var(--border, #27272a);
		background: var(--code-bg, #18181b);
		padding: 1rem;
		font-size: 0.875rem;
		line-height: 1.5;
		overflow-x: auto;
	}
	.code-and-preview .code :global(code) {
		background: transparent;
		white-space: pre;
	}
	.code-and-preview .preview {
		min-height: 360px;
		height: 360px;
		background: var(--bg, #0f0f12);
	}
	.code-and-preview.side-by-side .preview {
		height: auto;
		min-height: 360px;
	}
	.code-and-preview .preview :global(.excalidraw) {
		height: 100%;
		min-height: 360px;
	}
</style>
