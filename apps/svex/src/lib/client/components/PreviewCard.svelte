<script lang="ts">
	/**
	 * Standardized preview card: ephemeral rooms, whiteboards, collections.
	 * Modes: landing (compact) | workspace (title, updated date, actions menu).
	 */
	import ActionsMenu from "./ActionsMenu.svelte";

	let {
		variant,
		mode = "landing",
		href = undefined,
		onclick = undefined,
		name,
		count = undefined,
		remainingHours = undefined,
		access = "readWrite",
		formatRemaining = undefined,
		createdAt = undefined,
		updatedAt = undefined,
		formatDateAgo = undefined,
		ephemeralBadge = undefined,
		children,
		actions = undefined,
		sid = undefined,
		class: className = "",
	}: {
		variant: "ephemeral" | "whiteboard" | "collection";
		mode?: "landing" | "workspace";
		href?: string;
		onclick?: (e: MouseEvent) => void;
		name: string;
		count?: number;
		remainingHours?: number | null;
		access?: "read" | "readWrite";
		formatRemaining?: (hours: number | null) => string;
		createdAt?: number | null;
		updatedAt?: number | null;
		formatDateAgo?: (date: number | null) => string;
		/** When variant is ephemeral: show "Created" or "Joined" badge */
		ephemeralBadge?: "created" | "joined";
		children: import("svelte").Snippet;
		actions?: import("svelte").Snippet;
		sid?: string;
		class?: string;
	} = $props();

	const typeLabel = $derived(
		variant === "ephemeral" ? "Ephemeral room" : variant === "whiteboard" ? "Whiteboard" : "Collection",
	);
	const showTypeLabel = $derived(mode === "landing");
	const collectionLayout = $derived(variant === "collection" ? "grid" : "row");
</script>

{#if onclick && !href}
	<button type="button" class="preview-card preview-card-button {className}" class:preview-card-ephemeral={variant === "ephemeral"} class:preview-card-whiteboard={variant === "whiteboard"} class:preview-card-collection={variant === "collection"} class:preview-card-collection-single={variant === "collection" && count === 1} class:preview-card-workspace={mode === "workspace"} class:preview-card-collection-grid={variant === "collection" && collectionLayout === "grid"} onclick={onclick}>
		{#if sid && actions}
			<ActionsMenu {sid}>{#snippet children()}{@render actions?.()}{/snippet}</ActionsMenu>
		{/if}
		<div class="preview-card-thumb">
			{@render children()}
		</div>
		<div class="preview-card-label">
			{#if showTypeLabel}
				<span class="preview-card-type">{typeLabel}</span>
			{/if}
			<span class="preview-card-name">{name}</span>
			{#if variant === "collection" && count != null}
				<span class="preview-card-meta">{count} whiteboard{count === 1 ? "" : "s"}</span>
			{:else if variant === "whiteboard" && formatDateAgo && (createdAt !== undefined || updatedAt !== undefined)}
				<span class="preview-card-meta">
					{#if createdAt !== undefined && createdAt != null}
						Created {formatDateAgo(createdAt)}
						{#if updatedAt !== undefined && updatedAt != null && updatedAt !== createdAt}
							 · Updated {formatDateAgo(updatedAt)}
						{/if}
					{:else if updatedAt !== undefined}
						Updated {formatDateAgo(updatedAt)}
					{/if}
				</span>
			{:else if variant === "ephemeral"}
				<div class="preview-card-meta-row">
					{#if ephemeralBadge}
						<span class="preview-card-ephemeral-badge" class:badge-created={ephemeralBadge === "created"} class:badge-joined={ephemeralBadge === "joined"}>
							{ephemeralBadge === "created" ? "Created" : "Joined"}
						</span>
					{/if}
					{#if access === "read"}
						<span class="preview-card-view-only" title="View only (opened via read-only link)" aria-label="View only">
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
							<span>View only</span>
						</span>
					{/if}
					{#if formatRemaining && remainingHours !== undefined}
						<span class="preview-card-ttl">{formatRemaining(remainingHours)}</span>
					{/if}
				</div>
			{/if}
		</div>
	</button>
{:else if href}
	<a {href} class="preview-card {className}" class:preview-card-ephemeral={variant === "ephemeral"} class:preview-card-whiteboard={variant === "whiteboard"} class:preview-card-collection={variant === "collection"} class:preview-card-collection-single={variant === "collection" && count === 1} class:preview-card-workspace={mode === "workspace"} class:preview-card-collection-grid={variant === "collection" && collectionLayout === "grid"}>
		{#if sid && actions}
			<ActionsMenu {sid}>{#snippet children()}{@render actions?.()}{/snippet}</ActionsMenu>
		{/if}
		<div class="preview-card-thumb">
			{@render children()}
		</div>
		<div class="preview-card-label">
			{#if showTypeLabel}
				<span class="preview-card-type">{typeLabel}</span>
			{/if}
			<span class="preview-card-name">{name}</span>
			{#if variant === "collection" && count != null}
				<span class="preview-card-meta">{count} whiteboard{count === 1 ? "" : "s"}</span>
			{:else if variant === "whiteboard" && formatDateAgo && (createdAt !== undefined || updatedAt !== undefined)}
				<span class="preview-card-meta">
					{#if createdAt !== undefined && createdAt != null}
						Created {formatDateAgo(createdAt)}
						{#if updatedAt !== undefined && updatedAt != null && updatedAt !== createdAt}
							 · Updated {formatDateAgo(updatedAt)}
						{/if}
					{:else if updatedAt !== undefined}
						Updated {formatDateAgo(updatedAt)}
					{/if}
				</span>
			{:else if variant === "ephemeral"}
				<div class="preview-card-meta-row">
					{#if ephemeralBadge}
						<span class="preview-card-ephemeral-badge" class:badge-created={ephemeralBadge === "created"} class:badge-joined={ephemeralBadge === "joined"}>
							{ephemeralBadge === "created" ? "Created" : "Joined"}
						</span>
					{/if}
					{#if access === "read"}
						<span class="preview-card-view-only" title="View only (opened via read-only link)" aria-label="View only">
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
							<span>View only</span>
						</span>
					{/if}
					{#if formatRemaining && remainingHours !== undefined}
						<span class="preview-card-ttl">{formatRemaining(remainingHours)}</span>
					{/if}
				</div>
			{/if}
		</div>
	</a>
{:else}
	<div class="preview-card {className}" class:preview-card-ephemeral={variant === "ephemeral"} class:preview-card-whiteboard={variant === "whiteboard"} class:preview-card-collection={variant === "collection"} class:preview-card-collection-single={variant === "collection" && count === 1} class:preview-card-workspace={mode === "workspace"} class:preview-card-collection-grid={variant === "collection" && collectionLayout === "grid"}>
		{#if sid && actions}
			<ActionsMenu {sid}>{#snippet children()}{@render actions?.()}{/snippet}</ActionsMenu>
		{/if}
		<div class="preview-card-thumb">
			{@render children()}
		</div>
		<div class="preview-card-label">
			{#if showTypeLabel}
				<span class="preview-card-type">{typeLabel}</span>
			{/if}
			<span class="preview-card-name">{name}</span>
			{#if variant === "collection" && count != null}
				<span class="preview-card-meta">{count} whiteboard{count === 1 ? "" : "s"}</span>
			{:else if variant === "whiteboard" && formatDateAgo && (createdAt !== undefined || updatedAt !== undefined)}
				<span class="preview-card-meta">
					{#if createdAt !== undefined && createdAt != null}
						Created {formatDateAgo(createdAt)}
						{#if updatedAt !== undefined && updatedAt != null && updatedAt !== createdAt}
							 · Updated {formatDateAgo(updatedAt)}
						{/if}
					{:else if updatedAt !== undefined}
						Updated {formatDateAgo(updatedAt)}
					{/if}
				</span>
			{:else if variant === "ephemeral"}
				<div class="preview-card-meta-row">
					{#if ephemeralBadge}
						<span class="preview-card-ephemeral-badge" class:badge-created={ephemeralBadge === "created"} class:badge-joined={ephemeralBadge === "joined"}>
							{ephemeralBadge === "created" ? "Created" : "Joined"}
						</span>
					{/if}
					{#if access === "read"}
						<span class="preview-card-view-only" title="View only (opened via read-only link)" aria-label="View only">
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
							<span>View only</span>
						</span>
					{/if}
					{#if formatRemaining && remainingHours !== undefined}
						<span class="preview-card-ttl">{formatRemaining(remainingHours)}</span>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.preview-card {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.35rem;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid var(--border);
		border-radius: 6px;
		overflow: hidden;
		min-height: 0;
		text-decoration: none;
		color: var(--text);
		transition:
			border-color 0.15s,
			transform 0.15s,
			background 0.15s;
	}
	a.preview-card:hover {
		background: rgba(39, 39, 42, 0.8);
		border-color: var(--accent);
		transform: translateY(-1px);
	}
	.preview-card-ephemeral {
		flex: 1 1 10rem;
		min-width: 8rem;
		max-width: 14rem;
	}
	.preview-card-whiteboard {
		flex: 1 1 10rem;
		min-width: 8rem;
		max-width: 12rem;
	}
	.preview-card-collection {
		flex: 1 1 18rem;
		min-width: 14rem;
		max-width: 24rem;
	}
	/* Single-item collection: same size as whiteboard (1x1) */
	.preview-card-collection-single {
		flex: 1 1 10rem;
		min-width: 8rem;
		max-width: 12rem;
	}
	.preview-card-workspace {
		position: relative;
		min-width: 14rem;
	}
	.preview-card-button {
		width: 100%;
		text-align: left;
		cursor: pointer;
		font: inherit;
		border: none;
	}
	.preview-card-button:hover {
		background: var(--muted);
	}
	.preview-card-collection-grid .preview-card-thumb {
		aspect-ratio: 1;
		display: grid;
		grid-template-columns: 1fr 1fr;
		grid-template-rows: 1fr 1fr;
		gap: 0.25rem;
	}
	.preview-card-collection-grid .preview-card-thumb > :global(*),
	:global(.preview-cell-inner) {
		aspect-ratio: 1;
		min-height: 0;
		overflow: hidden;
		border-radius: 4px;
	}
	/* 3 items: 3rd spans full second row */
	.preview-card-collection-grid .preview-card-thumb > :global(*:nth-child(3)):last-child {
		grid-column: 1 / -1;
	}
	.preview-card-collection-grid .preview-card-thumb :global(.hero) {
		height: 100%;
		min-height: 0;
		max-height: none;
		border-radius: 4px;
	}
	.preview-card-thumb {
		overflow: hidden;
		min-height: 0;
		border-radius: 4px;
		aspect-ratio: 4 / 3;
	}
	.preview-card-thumb :global(.hero) {
		height: 100%;
		min-height: 4rem;
		border-radius: 4px;
	}
	.preview-card-collection .preview-card-thumb {
		aspect-ratio: unset;
		display: flex;
		gap: 0.35rem;
	}
	.preview-card-collection .preview-card-thumb > :global(*) {
		flex: 1;
		min-width: 0;
		aspect-ratio: 4 / 3;
		overflow: hidden;
		border-radius: 4px;
	}
	.preview-card-collection .preview-card-thumb > :global(*) :global(.hero) {
		height: 100%;
		min-height: 0;
		border-radius: 4px;
	}
	.preview-card-label {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.preview-card-type {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
	}
	.preview-card-name {
		font-size: 0.8rem;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.preview-card-meta {
		font-size: 0.7rem;
		color: var(--muted);
	}
	.preview-card-meta-row {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex-wrap: wrap;
	}
	.preview-card-view-only {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--muted);
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.preview-card-ttl {
		font-size: 0.7rem;
		color: var(--muted);
	}
	.preview-card-ephemeral-badge {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
	}
	.preview-card-ephemeral-badge.badge-created {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}
	.preview-card-ephemeral-badge.badge-joined {
		background: rgba(59, 130, 246, 0.2);
		color: #3b82f6;
	}
</style>
