<script lang="ts">
	let {
		sid,
		title,
		confirmLabel = "Delete",
		onConfirm,
		onCancel,
	} = $props<{
		sid: string;
		title: string;
		confirmLabel?: string;
		onConfirm: () => void | Promise<void>;
		onCancel: () => void;
	}>();
</script>

<div
	id="confirm-{sid}"
	popover="manual"
	class="confirm-popover"
	style="position-anchor: --{sid};"
	role="dialog"
	aria-modal="true"
	aria-labelledby="confirm-title-{sid}"
>
	<p id="confirm-title-{sid}" class="confirm-title">{title}</p>
	<div class="confirm-actions">
		<button type="button" class="secondary" onclick={onCancel}>Cancel</button>
		<button type="button" class="danger" onclick={onConfirm}>{confirmLabel}</button>
	</div>
</div>

<style>
	.confirm-popover {
		display: none;
	}
	.confirm-popover:popover-open {
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
		min-width: 12rem;
	}
	@supports (position-anchor: --x) {
		.confirm-popover:popover-open {
			top: unset;
			right: unset;
			position-area: block-end;
			margin-top: 0.25rem;
		}
	}
	.confirm-title {
		margin: 0 0 0.75rem 0;
		font-size: 0.9rem;
	}
	.confirm-actions {
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
	.danger {
		background: #c53030;
		color: white;
		border: none;
		padding: 0.35rem 0.75rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;
	}
	.danger:hover {
		background: #9b2c2c;
	}
</style>
