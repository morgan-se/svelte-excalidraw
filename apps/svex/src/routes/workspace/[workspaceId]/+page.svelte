<script lang="ts">
	import { browser } from "$app/environment";
	import { goto } from "$app/navigation";
	import { invalidateAll } from "$app/navigation";
	import { formatDateAgo } from "$lib/core/date-format.js";
	import {
		createWhiteboard as createWhiteboardRemote,
		deleteWhiteboard as deleteWhiteboardRemote,
		createCollection as createCollectionRemote,
		deleteCollection as deleteCollectionRemote,
		deleteWorkspace as deleteWorkspaceRemote,
		renameCollection as renameCollectionRemote,
		renameWhiteboard as renameWhiteboardRemote,
		addWhiteboardToCollection as addWhiteboardToCollectionRemote,
		createShareLink,
		leaveWorkspace,
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
	const whiteboards = $derived((data?.whiteboards ?? []) as WhiteboardMeta[]);
	const collections = $derived((data?.collections ?? []) as Collection[]);
	const access = $derived(data?.access ?? "read");
	const isOwner = $derived(access === "readWrite");

	const whiteboardById = $derived(new Map(whiteboards.map((w) => [w.id, w])));
	const rootWhiteboardIds = $derived(whiteboards.map((w) => w.id));

	let copyFeedback = $state(false);
	let newCollectionSlug = $state("");
	let newWhiteboardName = $state("");
	let showNewCollection = $state(false);
	let showNewWhiteboard = $state(false);
	let showLeaveConfirm = $state(false);
	let showDeleteWorkspaceConfirm = $state(false);

	function workspaceUrl(col?: string) {
		return col ? `/workspace/${workspaceId}/${col}` : `/workspace/${workspaceId}`;
	}

	async function doLeaveWorkspace() {
		await leaveWorkspace(workspaceId);
		showLeaveConfirm = false;
		goto("/");
	}

	async function doDeleteWorkspace() {
		const result = await deleteWorkspaceRemote(workspaceId);
		showDeleteWorkspaceConfirm = false;
		if ("error" in result) return;
		goto("/");
	}

	async function copyWorkspaceLink(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (!browser) return;
		const result = await createShareLink({ workspaceId, roomId: "_", access: "readWrite" });
		if ("error" in result) return;
		try {
			await navigator.clipboard.writeText(result.url);
			copyFeedback = true;
			setTimeout(() => (copyFeedback = false), 2000);
		} catch {}
	}

	function anchorId(id: string) {
		return "del-" + id.replace(/[^a-zA-Z0-9_-]/g, "_");
	}

	function openWhiteboard(id: string) {
		goto(whiteboardUrl(workspaceId, id));
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
	const collectionConfirmCleanups = new Map<string, () => void>();
	function showConfirmCollection(sid: string) {
		collectionConfirmCleanups.get(sid)?.();
		collectionConfirmCleanups.set(sid, showPopover("confirm-" + sid));
	}
	function hideConfirmCollection(sid: string) {
		collectionConfirmCleanups.get(sid)?.();
		collectionConfirmCleanups.delete(sid);
	}

	async function createCollection() {
		const name = newCollectionSlug.trim() || "Collection";
		const result = await createCollectionRemote({ workspaceId, name });
		if ("error" in result) return;
		newCollectionSlug = "";
		showNewCollection = false;
		await invalidateAll();
		goto(workspaceUrl(result.collection));
	}

	async function addToCollection(whiteboardId: string, collection: string) {
		await addWhiteboardToCollectionRemote({ workspaceId, collection, whiteboardId });
		await invalidateAll();
	}

	async function deleteCollection(col: string) {
		await deleteCollectionRemote({ workspaceId, collection: col });
		await invalidateAll();
	}

	async function newWhiteboard(name?: string) {
		const result = await createWhiteboardRemote(
			name?.trim() ? { workspaceId, name: name.trim() } : workspaceId,
		);
		if ("error" in result) return;
		const { whiteboardId } = result;
		newWhiteboardName = "";
		showNewWhiteboard = false;
		await invalidateAll();
		goto(whiteboardUrl(workspaceId, whiteboardId));
	}

	async function deleteWhiteboard(id: string, sid: string) {
		hideConfirm(sid);
		await deleteWhiteboardRemote({ workspaceId, whiteboardId: id });
		await invalidateAll();
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
			displayName: newName.trim() || newId,
		});
		hideRenameWhiteboard(sid);
		if (ok) await invalidateAll();
	}
</script>

<svelte:head>
	<title>Workspace {workspaceId} – SVEX</title>
</svelte:head>

<div class="workspace-page">
	<div class="toolbar">
		<a href="/">← Back</a>
		<h1>Workspace {workspaceId}</h1>
		<button type="button" class="toolbar-copy" onclick={copyWorkspaceLink} title="Copy a link to invite others with edit access">
			{copyFeedback ? "Link copied!" : "Share workspace"}
		</button>
		<button type="button" class="toolbar-leave" onclick={() => (showLeaveConfirm = true)} title="Leave this workspace">
			Leave workspace
		</button>
		{#if isOwner}
			<button type="button" class="toolbar-delete" onclick={() => (showDeleteWorkspaceConfirm = true)} title="Delete this workspace and all its data">
				Delete workspace
			</button>
		{/if}
		{#if showLeaveConfirm}
			<div class="leave-confirm">
				<span>Leave this workspace? You can rejoin with a share link.</span>
				<div class="leave-confirm-actions">
					<button type="button" class="primary" onclick={doLeaveWorkspace}>Leave</button>
					<button type="button" class="secondary" onclick={() => (showLeaveConfirm = false)}>Cancel</button>
				</div>
			</div>
		{/if}
		{#if showDeleteWorkspaceConfirm}
			<div class="leave-confirm delete-confirm">
				<span>Delete this workspace and all whiteboards? This cannot be undone.</span>
				<div class="leave-confirm-actions">
					<button type="button" class="primary menu-item-danger" onclick={doDeleteWorkspace}>Delete</button>
					<button type="button" class="secondary" onclick={() => (showDeleteWorkspaceConfirm = false)}>Cancel</button>
				</div>
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
			{#if showNewCollection}
				<div class="inline-form">
					<input type="text" placeholder="e.g. Meeting Notes" bind:value={newCollectionSlug} onkeydown={(e) => e.key === "Enter" && createCollection()} />
					<button type="button" class="primary" onclick={createCollection}>Create</button>
					<button type="button" class="secondary" onclick={() => { showNewCollection = false; newCollectionSlug = ""; }}>Cancel</button>
				</div>
			{:else}
				<button type="button" class="secondary" onclick={() => (showNewCollection = true)}>New collection</button>
			{/if}
			<button type="button" class="secondary" onclick={() => invalidateAll()} title="Refresh">Refresh</button>
		</div>

		<section class="section">
			<h2 class="section-title">Collections</h2>
			{#if collections.length === 0}
				<p class="empty">No collections. Create one to group whiteboards.</p>
			{:else}
				<div class="preview-list">
					{#each collections as col}
						{@const colSid = "col-" + col.collection.replace(/[^a-zA-Z0-9_-]/g, "_")}
						{@const n = (col.whiteboardIds ?? []).length}
						{#snippet colActions()}
							<button type="button" role="menuitem" onclick={() => showRenameCollection(colSid)}>Rename</button>
							<button type="button" role="menuitem" class="menu-item-danger" onclick={() => showConfirmCollection(colSid)}>Delete</button>
						{/snippet}
						<div>
							<PreviewCard
								variant="collection"
								mode="workspace"
								href={workspaceUrl(col.collection)}
								name={col.name ?? col.collection}
								count={n}
								sid={colSid}
								actions={colActions}
							>
								{#snippet children()}
									{#each (col.whiteboardIds ?? []).slice(0, 4) as wbId}
										<div class="preview-cell-inner">
											<WhiteboardThumbnail {workspaceId} whiteboardId={String(wbId)} collection={col.collection} size="medium" aspectRatio="1" />
										</div>
									{/each}
								{/snippet}
							</PreviewCard>
							<RenamePopover
								sid={colSid}
								title="Rename collection"
								value={col.name ?? col.collection}
								placeholder="e.g. Meeting Notes"
								onRename={(newName) => doRenameCollection(col.collection, newName)}
								onCancel={() => hideRenameCollection(colSid)}
							/>
							<ConfirmPopover
								sid={colSid}
								title="Delete this collection?"
								onConfirm={async () => { hideConfirmCollection(colSid); await deleteCollection(col.collection); }}
								onCancel={() => hideConfirmCollection(colSid)}
							/>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<section class="section">
			<h2 class="section-title">Whiteboards</h2>
			{#if whiteboards.length === 0 && collections.length === 0}
				<p class="empty">No whiteboards yet.</p>
			{:else if whiteboards.length === 0}
				<p class="empty">All whiteboards are in collections.</p>
			{:else}
				<div class="preview-list preview-list-grid">
					{#each rootWhiteboardIds as id}
						{@const meta = whiteboardById.get(id)}
						{#if meta}
							{@const sid = anchorId(id)}
							{@const wbRenameSid = "wb-" + sid}
							{#snippet wbActions()}
								<button type="button" role="menuitem" onclick={() => showRenameWhiteboard(wbRenameSid)}>Rename</button>
								{#if collections.length > 0}
									{#each collections as c}
										<button type="button" role="menuitem" onclick={() => addToCollection(id, c.collection)}>Add to {c.collection}</button>
									{/each}
								{/if}
								<button type="button" role="menuitem" class="menu-item-danger" onclick={() => showConfirm(sid)}>Delete</button>
							{/snippet}
							<div style="anchor-name: --{wbRenameSid};">
								<PreviewCard
									variant="whiteboard"
									mode="workspace"
									name={meta?.name ?? id}
									createdAt={meta?.createdAt ?? null}
									updatedAt={meta?.lastUpdatedAt ?? null}
									formatDateAgo={formatDateAgo}
									onclick={() => openWhiteboard(id)}
									sid={sid}
									actions={wbActions}
								>
									{#snippet children()}
										<WhiteboardThumbnail {workspaceId} whiteboardId={id} size="medium" aspectRatio="4/3" />
									{/snippet}
								</PreviewCard>
								<RenamePopover
									sid={wbRenameSid}
									title="Rename whiteboard"
									value={meta?.name ?? id}
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
						{/if}
					{/each}
				</div>
			{/if}
		</section>
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
	.toolbar-copy {
		padding: 0.25rem 0.5rem;
		font-size: 0.875rem;
		background: var(--border);
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: 4px;
		cursor: pointer;
	}
	.toolbar-copy:hover {
		background: var(--accent);
		color: var(--bg);
		border-color: var(--accent);
	}
	.toolbar-leave {
		padding: 0.25rem 0.5rem;
		font-size: 0.875rem;
		background: transparent;
		color: var(--muted);
		border: 1px solid var(--border);
		border-radius: 4px;
		cursor: pointer;
	}
	.toolbar-leave:hover {
		color: var(--accent);
		border-color: var(--accent);
	}
	.toolbar-delete {
		padding: 0.25rem 0.5rem;
		font-size: 0.875rem;
		background: transparent;
		color: var(--muted);
		border: 1px solid var(--border);
		border-radius: 4px;
		cursor: pointer;
	}
	.toolbar-delete:hover {
		color: #ef4444;
		border-color: #ef4444;
	}
	.delete-confirm .menu-item-danger {
		background: #ef4444;
		border-color: #ef4444;
	}
	.leave-confirm {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 1rem;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 6px;
		font-size: 0.9rem;
	}
	.leave-confirm-actions {
		display: flex;
		gap: 0.5rem;
	}
	.empty {
		color: var(--muted);
		margin: 0 0 1rem 0;
	}
	.section {
		margin-bottom: 2rem;
	}
	.section-title {
		font-size: 1rem;
		margin: 0 0 0.75rem 0;
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
	.inline-form {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
	}
	.inline-form input {
		padding: 0.35rem 0.5rem;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: var(--bg);
		color: var(--text);
		font-size: 0.9rem;
		min-width: 8rem;
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
