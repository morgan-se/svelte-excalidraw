<script lang="ts">
	let {
		sid,
		title,
		value = "",
		placeholder = "e.g. meeting-notes",
		onRename,
		onCancel,
	} = $props<{
		sid: string;
		title: string;
		value?: string;
		placeholder?: string;
		onRename: (newName: string) => void | Promise<void>;
		onCancel: () => void;
	}>();

	let input = $state("");
	$effect(() => {
		input = value;
	});
</script>

<div
	id="rename-{sid}"
	popover="manual"
	class="rename-popover"
	style="position-anchor: --{sid};"
	role="dialog"
	aria-modal="true"
	aria-labelledby="rename-title-{sid}"
>
	<p id="rename-title-{sid}" class="rename-title">{title}</p>
	<input
		type="text"
		class="rename-input"
		placeholder={placeholder}
		bind:value={input}
		onkeydown={(e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				onRename(input.trim());
			}
			if (e.key === "Escape") onCancel();
		}}
	/>
	<div class="rename-actions">
		<button type="button" class="secondary" onclick={onCancel}>Cancel</button>
		<button type="button" class="primary" onclick={() => onRename(input.trim())}>Rename</button>
	</div>
</div>

<style>
	.rename-popover {
		display: none;
	}
	.rename-popover:popover-open {
		display: block;
		position: absolute;
		top: 2.5rem;
		right: 0.5rem;
		padding: 0.75rem;
		background: var(--bg);
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		z-index: 10;
		min-width: 14rem;
	}
	@supports (position-anchor: --x) {
		.rename-popover:popover-open {
			top: unset;
			right: unset;
			position-area: block-end;
			margin-top: 0.25rem;
		}
	}
	.rename-title {
		margin: 0 0 0.5rem 0;
		font-size: 0.9rem;
	}
	.rename-input {
		display: block;
		width: 100%;
		margin-bottom: 0.75rem;
		padding: 0.4rem 0.5rem;
		background: var(--border);
		border: 1px solid var(--border);
		border-radius: 4px;
		color: var(--text);
		font-size: 0.9rem;
		box-sizing: border-box;
	}
	.rename-input:focus {
		outline: none;
		border-color: var(--accent);
	}
	.rename-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}
	.secondary {
		background: var(--border);
		color: var(--text);
		border: none;
		padding: 0.35rem 0.75rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;
	}
	.secondary:hover {
		background: var(--muted);
	}
	.primary {
		background: var(--accent);
		color: white;
		border: none;
		padding: 0.35rem 0.75rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;
	}
	.primary:hover {
		opacity: 0.9;
	}
</style>
