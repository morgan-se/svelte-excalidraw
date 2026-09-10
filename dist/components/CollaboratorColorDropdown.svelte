<script lang="ts">
	import { COLLABORATOR_COLORS } from "../collaborator-colors.js";
	import type { CollaboratorColorHex } from "../collaborator-colors.js";

	let {
		value,
		onSelect,
		open = false,
		onOpenChange,
	}: {
		value: CollaboratorColorHex;
		onSelect: (hex: CollaboratorColorHex) => void;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	} = $props();

	const widgetId = crypto.randomUUID();

	function toggle() {
		onOpenChange?.(!open);
	}

	function select(hex: CollaboratorColorHex) {
		onSelect(hex);
		onOpenChange?.(false);
	}

	let elColorDropdownWrap = $state<HTMLDivElement | undefined>();
	function handleClickOutside(e: MouseEvent) {
		const target = e.target as Node;
		if (elColorDropdownWrap && !elColorDropdownWrap.contains(target)) {
			onOpenChange?.(false);
		}
	}
</script>

<svelte:window on:click={handleClickOutside} />

<div bind:this={elColorDropdownWrap} class="color-dropdown-wrap">
	<button
		type="button"
		class="color-dropdown-trigger"
		class:open
		onclick={toggle}
		aria-label="Your color"
		aria-haspopup="menu"
		aria-expanded={open}
		style="anchor-name: --color-dropdown-{widgetId};"
	>
		<span class="color-dropdown-swatch" style="background-color: {value}"
		></span>
	</button>
	{#if open}
		<div
			class="color-dropdown-menu"
			role="menu"
			style="position-anchor: --color-dropdown-{widgetId};"
		>
			{#each COLLABORATOR_COLORS as hex}
				<button
					type="button"
					role="menuitem"
					class="color-dropdown-option"
					class:selected={value === hex}
					onclick={() => select(hex)}
					title={hex}
					aria-label="Color {hex}"
				>
					<span
						class="color-dropdown-swatch"
						style="background-color: {hex}"
					></span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.color-dropdown-wrap {
		position: relative;
	}
	.color-dropdown-trigger {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2px;
		border-radius: 4px;
		border: 2px solid transparent;
		background: transparent;
		cursor: pointer;
		transition: border-color 0.15s;
	}
	.color-dropdown-trigger:hover {
		border-color: var(--collaborator-color-border, #a1a1aa);
	}
	.color-dropdown-trigger.open {
		border-color: var(--collaborator-color-accent, #fc6241);
	}
	.color-dropdown-swatch {
		display: block;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 3px;
	}
	.color-dropdown-menu {
		position: fixed;
		inset: auto;
		inset-block-start: anchor(bottom, 0);
		margin-block-start: 0.25rem;
		justify-self: anchor-center;
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		grid-template-rows: repeat(2, 1fr);
		aspect-ratio: 5 / 2;
		gap: 0.25rem;
		padding: 0.35rem;
		background: var(--collaborator-color-bg, #0f0f12);
		border: 1px solid var(--collaborator-color-border, #27272a);
		border-radius: 6px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		z-index: 20;
	}
	@supports not (anchor-name: --anchor) {
		.color-dropdown-menu {
			inset: unset;
			inset-block-start: unset;
			justify-self: unset;
			top: 100%;
			left: 50%;
			transform: translateX(-50%);
			margin-block-start: 0.25rem;
		}
	}
	.color-dropdown-option {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2px;
		border-radius: 4px;
		border: 2px solid transparent;
		background: none;
		cursor: pointer;
	}
	.color-dropdown-option:hover {
		border-color: var(--collaborator-color-border, #a1a1aa);
	}
	.color-dropdown-option.selected {
		border-color: var(--collaborator-color-accent, #fc6241);
	}
</style>
