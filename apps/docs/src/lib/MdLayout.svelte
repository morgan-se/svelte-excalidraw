<script lang="ts">
	import type { Snippet } from "svelte";
	import { onMount } from "svelte";

	interface Props {
		title?: string;
		children?: Snippet;
		[key: string]: unknown;
	}
	let { title = "Docs", children, ...rest }: Props = $props();

	let contentEl: HTMLDivElement | undefined;

	function getPreText(pre: HTMLPreElement): string {
		const code = pre.querySelector("code");
		return (code ?? pre).textContent ?? "";
	}

	function wrapTables(root: HTMLElement) {
		root.querySelectorAll<HTMLTableElement>("table").forEach((table) => {
			if (table.parentElement?.classList.contains("table-scroll-wrap")) return;
			const wrapper = document.createElement("div");
			wrapper.className = "table-scroll-wrap";
			table.parentNode?.insertBefore(wrapper, table);
			wrapper.appendChild(table);
		});
	}

	function injectCopyButtons(root: HTMLElement) {
		root.querySelectorAll<HTMLPreElement>("pre").forEach((pre) => {
			if (pre.hasAttribute("data-copy-btn")) return;
			pre.setAttribute("data-copy-btn", "");
			const wrapper = document.createElement("div");
			wrapper.className = "code-block-wrapper";
			pre.parentNode?.insertBefore(wrapper, pre);
			wrapper.appendChild(pre);

			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "copy-btn";
			btn.textContent = "Copy";
			btn.setAttribute("aria-label", "Copy code");
			wrapper.appendChild(btn);

			btn.addEventListener("click", async () => {
				const text = getPreText(pre);
				try {
					await navigator.clipboard.writeText(text);
					btn.textContent = "Copied!";
					btn.classList.add("copied");
					setTimeout(() => {
						btn.textContent = "Copy";
						btn.classList.remove("copied");
					}, 1500);
				} catch {
					btn.textContent = "Failed";
					setTimeout(() => (btn.textContent = "Copy"), 1500);
				}
			});
		});
	}

	onMount(() => {
		if (!contentEl) return;
		wrapTables(contentEl);
		injectCopyButtons(contentEl);
		const observer = new MutationObserver(() => {
			if (contentEl) {
				wrapTables(contentEl);
				injectCopyButtons(contentEl);
			}
		});
		observer.observe(contentEl, { childList: true, subtree: true });
		return () => observer.disconnect();
	});
</script>

<svelte:head>
	<title>{title} | svelte-excalidraw</title>
</svelte:head>

<div class="doc-content" bind:this={contentEl}>
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	.doc-content :global(.code-block-wrapper) {
		position: relative;
		margin: 1rem 0;
	}
	.doc-content :global(.code-block-wrapper pre) {
		margin: 0;
	}
	.doc-content :global(.code-and-preview .code-block-wrapper) {
		margin: 0;
	}
	.doc-content :global(.copy-btn) {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		font-family: inherit;
		background: var(--border, #27272a);
		color: var(--muted, #a1a1aa);
		border: 1px solid var(--border, #27272a);
		border-radius: 4px;
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
	}
	.doc-content :global(.copy-btn:hover) {
		background: var(--code-bg, #18181b);
		color: var(--text, #e4e4e7);
	}
	.doc-content :global(.copy-btn.copied) {
		color: var(--accent, #FC6241);
	}
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
		border-left: 4px solid var(--accent, #FC6241);
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
		color: var(--accent, #FC6241);
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
	.doc-content :global(.table-scroll-wrap) {
		overflow-x: auto;
		margin: 1rem 0;
		border-radius: 6px;
		border: 1px solid var(--border, #27272a);
	}
	.doc-content :global(table) {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
		margin: 0;
	}
	.doc-content :global(thead) {
		background: var(--code-bg, #18181b);
		border-bottom: 2px solid var(--border, #27272a);
	}
	.doc-content :global(th) {
		text-align: left;
		font-weight: 600;
		padding: 0.6rem 0.75rem;
		color: var(--text, #e4e4e7);
	}
	.doc-content :global(td) {
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--border, #27272a);
		vertical-align: top;
	}
	.doc-content :global(tbody tr:last-child td) {
		border-bottom: none;
	}
	.doc-content :global(table code) {
		font-size: 0.85em;
		padding: 0.15em 0.35em;
		background: var(--code-bg, #18181b);
		border-radius: 4px;
	}
</style>
