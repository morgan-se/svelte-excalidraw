<script lang="ts">
	/** Unique id for this menu instance (used for popover id and anchor). */
	let { sid, children } = $props<{ sid: string; children?: import("svelte").Snippet }>();

	let open = $state(false);
	const cleanups = new Map<string, () => void>();

	function toggle() {
		if (open) {
			close();
			return;
		}
		open = true;
		const popover = document.getElementById("menu-" + sid) as HTMLDivElement & { showPopover?: () => void; hidePopover?: () => void };
		const menuBtn = popover?.previousElementSibling;
		popover?.showPopover?.();
		const cleanup = () => {
			document.removeEventListener("click", onOutside);
			cleanups.delete(sid);
			open = false;
		};
		const onOutside = (e: MouseEvent) => {
			const target = e.target as Node;
			if (popover && !popover.contains(target) && menuBtn && !menuBtn.contains(target)) {
				popover.hidePopover?.();
				cleanup();
			}
		};
		cleanups.set(sid, cleanup);
		setTimeout(() => document.addEventListener("click", onOutside), 0);
	}

	function close() {
		cleanups.get(sid)?.();
		cleanups.delete(sid);
		open = false;
		const popover = document.getElementById("menu-" + sid) as HTMLDivElement & { hidePopover?: () => void };
		popover?.hidePopover?.();
	}
</script>

<button
	type="button"
	class="menu-trigger"
	style="anchor-name: --{sid};"
	title="Actions"
	onclick={(e) => {
		e.preventDefault();
		e.stopPropagation();
		toggle();
	}}
	aria-haspopup="menu"
	aria-expanded={open}
>
	⋮
</button>
<div
	id="menu-{sid}"
	popover="manual"
	class="menu-popover"
	style="position-anchor: --{sid};"
	role="menu"
	tabindex="-1"
	onclick={(e) => {
		e.preventDefault();
		e.stopPropagation();
		if ((e.target as HTMLElement).closest("button[role='menuitem']")) close();
	}}
	onkeydown={(e) => {
		if (e.key === "Escape") close();
	}}
>
	{#if children}
		{@render children?.()}
	{/if}
</div>

<style>
	.menu-trigger {
		position: absolute;
		bottom: 0.5rem;
		right: 0.5rem;
		width: 1.75rem;
		height: 1.75rem;
		padding: 0;
		font-size: 1.1rem;
		line-height: 1;
		background: var(--bg);
		color: var(--muted);
		border: 1px solid var(--border);
		border-radius: 4px;
		cursor: pointer;
		z-index: 1;
	}
	.menu-trigger:hover {
		color: var(--text);
		background: var(--border);
	}
	.menu-popover {
		display: none;
	}
	.menu-popover:popover-open {
		display: flex;
		flex-direction: column;
		position: absolute;
		top: unset;
		right: 0.5rem;
		padding: 0.25rem 0;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 6px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		z-index: 10;
		min-width: 10rem;
	}
	@supports (position-anchor: --x) {
		.menu-popover:popover-open {
			position-area: block-end;
			margin-top: 0.25rem;
		}
	}
	.menu-popover :global(button) {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.4rem 0.75rem;
		font-size: 0.9rem;
		background: none;
		border: none;
		color: var(--text);
		cursor: pointer;
	}
	.menu-popover :global(button:hover) {
		background: var(--border);
	}
	.menu-popover :global(button.menu-item-danger:hover) {
		background: rgba(197, 48, 48, 0.2);
		color: #c53030;
	}
</style>
