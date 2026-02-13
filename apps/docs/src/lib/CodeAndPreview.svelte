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
		lang?: string;
	}

	let { example, lang = 'svelte' }: Props = $props();
	const Comp = $derived(example.default);
	const { langClass, html } = $derived(getHighlightedCode(example.source, lang));
</script>

<div class="code-and-preview">
	<pre class="code language-{langClass}"><code class="language-{langClass}">{@html html}</code></pre>
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
	.code-and-preview .code {
		margin: 0;
		border-radius: 0;
		border-bottom: 1px solid var(--border, #27272a);
		background: var(--code-bg, #18181b);
		padding: 1rem;
		overflow-x: auto;
		font-size: 0.875rem;
		line-height: 1.5;
	}
	.code-and-preview .code :global(code) {
		background: transparent;
	}
	.code-and-preview .preview {
		height: 320px;
		background: var(--bg, #0f0f12);
	}
	.code-and-preview .preview :global(.excalidraw) {
		height: 100%;
	}
</style>
