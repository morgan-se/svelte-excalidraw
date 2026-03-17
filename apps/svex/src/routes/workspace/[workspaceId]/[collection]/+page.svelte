<script lang="ts">
	import { browser } from "$app/environment";
	import { goto } from "$app/navigation";
	import { invalidateAll } from "$app/navigation";
	import { formatDateAgo } from "$lib/core/date-format.js";
	import {
		createWhiteboard as createWhiteboardRemote,
		deleteWhiteboard as deleteWhiteboardRemote,
		deleteCollection as deleteCollectionRemote,
		renameCollection as renameCollectionRemote,
		renameWhiteboard as renameWhiteboardRemote,
		removeWhiteboardFromCollection as removeWhiteboardFromCollectionRemote,
	} from "$lib/svex.remote.js";
	import { slugifyCollectionName } from "$lib/client/fs-storage.js";
	import { whiteboardUrl } from "$lib/core/whiteboard-url.js";
	import WhiteboardThumbnail from "$lib/client/components/WhiteboardThumbnail.svelte";
	import PreviewCard from "$lib/client/components/PreviewCard.svelte";
	import ActionsMenu from "$lib/client/components/ActionsMenu.svelte";
	import ConfirmPopover from "$lib/client/components/ConfirmPopover.svelte";
	import RenamePopover from "$lib/client/components/RenamePopover.svelte";
	import { showPopover } from "$lib/client/components/popover-utils.js";

	type WhiteboardMeta = { id: string; name?: string; description?: string; createdAt: number | null; lastUpdatedAt: number | null };
	type Collection = { collection: string; whiteboardIds: string[] };

	let { data } = $props();
	const workspaceId = $derived(data?.workspaceId ?? "");
	const collectionParam = $derived(data?.collection ?? "");
	let showNewWhiteboard = $state(false);
	let newWhiteboardName = $state("");
	const whiteboards = $derived((data?.whiteboards ?? []) as WhiteboardMeta[]);
	const collectionData = $derived(data?.collectionData as Collection | undefined);

	function workspaceUrl(col?: string) {
		return col ? `/workspace/${workspaceId}/${col}` : `/workspace/${workspaceId}`;
	}

	function anchorId(id: string) {
		return "del-" + id.replace(/[^a-zA-Z0-9_-]/g, "_");
	}

	function openWhiteboard(id: string, segment: string) {
		goto(whiteboardUrl(workspaceId, segment));
	}

	const confirmCleanups = new Map<string, () => void>();
	function showConfirm(sid: string) {
		confirmCleanups.get(sid)?.();
		confirmCleanups.set(sid, showPopover("confirm-" + sid));
	}
	function hideConfirm(sid: string) {
		confirmCleanups.get(sid)?.();
		confirmCleanups.delete(sid);
	}

	async function newWhiteboard(name?: string) {
		const result = await createWhiteboardRemote(
			name?.trim()
				? { workspaceId, name: name.trim(), collection: collectionParam }
				: { workspaceId, collection: collectionParam },
		);
		if ("error" in result) return;
		const { whiteboardId } = result;
		newWhiteboardName = "";
		showNewWhiteboard = false;
		await invalidateAll();
		goto(whiteboardUrl(workspaceId, `${collectionParam}/${whiteboardId}`));
	}

	async function deleteWhiteboard(id: string, sid: string) {
		hideConfirm(sid);
		await deleteWhiteboardRemote({
			workspaceId,
			whiteboardId: id,
			collection: collectionParam,
		});
		await invalidateAll();
	}

	async function removeFromCollection(id: string) {
		if (!collectionData) return;
		await removeWhiteboardFromCollectionRemote({ workspaceId, collection: collectionData.collection, whiteboardId: id });
		await invalidateAll();
	}

	async function deleteCollectionAction() {
		if (!collectionData) return;
		await deleteCollectionRemote({ workspaceId, collection: collectionData.collection });
		await invalidateAll();
		goto(workspaceUrl());
	}

	const renameCollectionCleanups = new Map<string, () => void>();
	function showRenameCollection(sid: string) {
		renameCollectionCleanups.get(sid)?.();
		renameCollectionCleanups.set(sid, showPopover("rename-" + sid));
	}
	function hideRenameCollection(sid: string) {
		renameCollectionCleanups.get(sid)?.();
		renameCollectionCleanups.delete(sid);
	}

	async function doRenameCollection(oldCollection: string, newName: string) {
		const newCollection = slugifyCollectionName(newName.trim()) || oldCollection;
		if (newCollection === oldCollection) return;
		const ok = await renameCollectionRemote({
			workspaceId,
			oldCollection,
			newCollection,
			displayName: newName.trim() || newCollection,
		});
		hideRenameCollection("col-" + oldCollection.replace(/[^a-zA-Z0-9_-]/g, "_"));
		if (ok) {
			await invalidateAll();
			goto(workspaceUrl(newCollection));
		}
	}

	const renameWhiteboardCleanups = new Map<string, () => void>();
	function showRenameWhiteboard(sid: string) {
		renameWhiteboardCleanups.get(sid)?.();
		renameWhiteboardCleanups.set(sid, showPopover("rename-" + sid));
	}
	function hideRenameWhiteboard(sid: string) {
		renameWhiteboardCleanups.get(sid)?.();
		renameWhiteboardCleanups.delete(sid);
	}
	function slugifyWhiteboardId(name: string) {
		return slugifyCollectionName(name) || "board";
	}
	async function doRenameWhiteboard(oldId: string, newName: string, sid: string) {
		const newId = slugifyWhiteboardId(newName.trim()) || oldId;
		if (newId === oldId) return;
		const ok = await renameWhiteboardRemote({
			workspaceId,
			oldId,
			newId,
			collection: collectionParam,
			displayName: newName.trim() || newId,
		});
		hideRenameWhiteboard(sid);
		if (ok) await invalidateAll();
	}
</script>

<svelte:head>
	<title>{collectionData?.collection ?? collectionParam} – {workspaceId} – SVEX</title>
</svelte:head>

<div class="workspace-page">
	<div class="toolbar">
		<a href={workspaceUrl()}>← Back to workspace</a>
		<h1>{collectionData?.collection ?? collectionParam}</h1>
		{#if collectionData}
			<div class="toolbar-actions" style="anchor-name: --col-{collectionParam.replace(/[^a-zA-Z0-9_-]/g, '_')};">
				<ActionsMenu sid={"col-" + collectionParam.replace(/[^a-zA-Z0-9_-]/g, "_")}>
					{#snippet children()}
						<button type="button" role="menuitem" onclick={() => showRenameCollection("col-" + collectionParam.replace(/[^a-zA-Z0-9_-]/g, "_"))}>Rename collection</button>
						<button type="button" role="menuitem" class="menu-item-danger" onclick={deleteCollectionAction}>Delete collection</button>
					{/snippet}
				</ActionsMenu>
				<RenamePopover
					sid={"col-" + collectionParam.replace(/[^a-zA-Z0-9_-]/g, "_")}
					title="Rename collection"
					value={collectionData?.name ?? collectionParam}
					placeholder="e.g. Meeting Notes"
					onRename={(newName) => doRenameCollection(collectionParam, newName)}
					onCancel={() => hideRenameCollection("col-" + collectionParam.replace(/[^a-zA-Z0-9_-]/g, "_"))}
				/>
			</div>
		{/if}
	</div>

	<div class="whiteboard-list">
		<div class="list-actions">
			{#if showNewWhiteboard}
				<div class="inline-form">
					<input type="text" placeholder="e.g. Q1 Review" bind:value={newWhiteboardName} onkeydown={(e) => e.key === "Enter" && newWhiteboard(newWhiteboardName)} />
					<button type="button" class="primary" onclick={() => newWhiteboard(newWhiteboardName)}>Create</button>
					<button type="button" class="secondary" onclick={() => { showNewWhiteboard = false; newWhiteboardName = ""; }}>Cancel</button>
				</div>
			{:else}
				<button type="button" class="primary" onclick={() => (showNewWhiteboard = true)}>New whiteboard</button>
			{/if}
			<button type="button" class="secondary" onclick={() => invalidateAll()} title="Refresh">Refresh</button>
		</div>

		{#if whiteboards.length === 0}
			<p class="empty">No whiteboards in this collection. Create one above.</p>
		{:else}
			<div class="preview-list preview-list-grid">
				{#each whiteboards as whiteboard}
				{@const { id, name, createdAt, lastUpdatedAt } = whiteboard}
					{@const sid = anchorId(id)}
					{@const wbRenameSid = "wb-" + sid}
					{@const segment = `${collectionParam}/${id}`}
					{#snippet wbActions()}
						<button type="button" role="menuitem" onclick={() => showRenameWhiteboard(wbRenameSid)}>Rename</button>
						<button type="button" role="menuitem" onclick={() => removeFromCollection(id)}>Remove from collection</button>
						<button type="button" role="menuitem" class="menu-item-danger" onclick={() => showConfirm(sid)}>Delete</button>
					{/snippet}
					<div style="anchor-name: --{wbRenameSid};">
						<PreviewCard
							variant="whiteboard"
							mode="workspace"
							name={whiteboard.name ?? id}
							createdAt={createdAt}
							updatedAt={lastUpdatedAt}
							formatDateAgo={formatDateAgo}
							onclick={() => openWhiteboard(id, segment)}
							sid={sid}
							actions={wbActions}
						>
							{#snippet children()}
								<WhiteboardThumbnail {workspaceId} whiteboardId={id} collection={collectionParam} size="medium" aspectRatio="4/3" />
							{/snippet}
						</PreviewCard>
						<RenamePopover
							sid={wbRenameSid}
							title="Rename whiteboard"
							value={name ?? id}
							placeholder="e.g. Meeting Notes"
							onRename={(newName) => doRenameWhiteboard(id, newName, wbRenameSid)}
							onCancel={() => hideRenameWhiteboard(wbRenameSid)}
						/>
						<ConfirmPopover
							sid={sid}
							title="Delete this whiteboard?"
							onConfirm={() => deleteWhiteboard(id, sid)}
							onCancel={() => hideConfirm(sid)}
						/>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.workspace-page {
		max-width: 72rem;
		margin: 0 auto;
		padding: 1.5rem 1rem;
	}
	.toolbar {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}
	.toolbar a {
		color: var(--accent);
	}
	.toolbar h1 {
		margin: 0;
		font-size: 1.25rem;
	}
	.toolbar-actions {
		position: relative;
		margin-left: auto;
		min-height: 2rem;
	}
	.toolbar-actions :global(.menu-trigger) {
		position: relative;
		bottom: unset;
		right: unset;
	}
	.empty {
		color: var(--muted);
		margin: 0 0 1rem 0;
	}
	.preview-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}
	.preview-list-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 1rem;
	}
	.preview-list > div {
		position: relative;
		margin: 0;
	}
	.list-actions {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		flex-wrap: wrap;
	}
	.primary {
		background: var(--accent);
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 1rem;
	}
	.secondary {
		background: rgba(39, 39, 42, 0.8);
		color: var(--text);
		border: 1px solid var(--border);
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 1rem;
		font-weight: 500;
	}
	.secondary:hover {
		background: rgba(63, 63, 70, 0.9);
		border-color: var(--accent);
		color: var(--accent);
	}
</style>
