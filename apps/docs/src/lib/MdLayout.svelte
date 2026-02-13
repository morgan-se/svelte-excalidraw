<script lang="ts">
	import type { Snippet } from 'svelte';
	interface Props {
		title?: string;
		children?: Snippet;
		[key: string]: unknown;
	}
	let { title = 'Docs', children, ...rest }: Props = $props();
</script>

<svelte:head>
	<title>{title} | svelte-excalidraw</title>
</svelte:head>

<div class="doc-content">
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	.doc-content :global(pre) {
		background: var(--code-bg, #18181b);
		border-radius: 6px;
		padding: 1rem;
		overflow-x: auto;
		margin: 1rem 0;
	}
	.doc-content :global(pre code) {
		font-family: ui-monospace, monospace;
		font-size: 0.875rem;
		white-space: pre;
	}
	.doc-content :global(code) {
		font-family: ui-monospace, monospace;
		font-size: 0.9em;
	}
	.doc-content :global(dl) {
		margin: 1rem 0;
	}
	.doc-content :global(dt) {
		font-weight: 600;
		margin-top: 0.75rem;
		font-family: ui-monospace, monospace;
		font-size: 0.9rem;
	}
	.doc-content :global(dt:first-child) {
		margin-top: 0;
	}
	.doc-content :global(dd) {
		margin-left: 1rem;
		margin-bottom: 0.25rem;
		color: var(--muted, #a1a1aa);
		font-size: 0.9rem;
	}
	.doc-content :global(ul) {
		margin: 0.5rem 0 1rem 1.25rem;
	}
	.doc-content :global(blockquote) {
		margin: 1rem 0;
		padding: 0.75rem 1rem 0.75rem 1rem;
		border-left: 4px solid var(--accent, #a78bfa);
		background: var(--code-bg, #18181b);
		border-radius: 0 6px 6px 0;
		color: var(--muted, #a1a1aa);
		font-size: 0.95rem;
	}
	.doc-content :global(blockquote p:last-child) {
		margin-bottom: 0;
	}
	.doc-content :global(blockquote strong) {
		color: var(--text, #e4e4e7);
	}
	.doc-content :global(hr) {
		margin: 1.5rem 0;
		border: none;
		border-top: 1px solid var(--border, #27272a);
	}
	.doc-content :global(a) {
		color: var(--accent, #a78bfa);
		text-decoration: none;
	}
	.doc-content :global(a:hover) {
		text-decoration: underline;
	}
	.doc-content :global(.note) {
		margin-top: 2rem;
		padding: 0.75rem 1rem;
		background: var(--code-bg, #18181b);
		border-radius: 6px;
		font-size: 0.9rem;
		color: var(--muted, #a1a1aa);
	}
</style>
