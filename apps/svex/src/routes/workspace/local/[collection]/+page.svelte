<script lang="ts">
	import { browser } from "$app/environment";
	import { goto } from "$app/navigation";
	import { afterNavigate } from "$app/navigation";
	import { page } from "$app/stores";
	import { getLocalWorkspace, localWorkspaceStore } from "$lib/client/local/local-workspace.js";
	import {
		readSceneFromFile,
		writeSceneToFile,
		deleteExcalidrawFile,
		sanitizeWhiteboardName,
		normalizeExcalidrawDoc,
		listCollectionsFromDir,
		listWhiteboardsInCollection,
		moveFileFromCollection,
		deleteCollectionDir,
		renameCollectionDir,
		renameWhiteboardFile,
		slugifyCollectionName,
		type LocalCollection,
	} from "$lib/client/fs-storage.js";
	import { formatDateAgo } from "$lib/core/date-format.js";
	import { whiteboardLocalUrl, whiteboardRemoteUrl } from "$lib/core/whiteboard-url.js";
	import { setLocalHostSession } from "$lib/client/local/local-host-session.js";
	import { toInternalRoomIdLocal } from "$lib/client/local/local-room-id.js";
	import WhiteboardThumbnail from "$lib/client/components/WhiteboardThumbnail.svelte";
	import PreviewCard from "$lib/client/components/PreviewCard.svelte";
	import ActionsMenu from "$lib/client/components/ActionsMenu.svelte";
	import ConfirmPopover from "$lib/client/components/ConfirmPopover.svelte";
	import RenamePopover from "$lib/client/components/RenamePopover.svelte";
	import { showPopover } from "$lib/client/components/popover-utils.js";

	const collectionParam = $derived($page.params.collection ?? "");

	let localWorkspace = $state<{ workspaceId: string; dirHandle: FileSystemDirectoryHandle } | null>(null);
	let localCollection = $state<LocalCollection | null>(null);
	let whiteboards = $state<{ base: string; lastModified: number }[]>([]);
	let loading = $state(true);
	let showNewForm = $state(false);
	let newName = $state("");
	let copyFeedbackId = $state<string | null>(null);

	async function loadCollection() {
		if (!browser || !collectionParam) return;
		const ws = getLocalWorkspace();
		if (!ws) {
			goto("/workspace/local");
			return;
		}
		localWorkspace = ws;
		loading = true;
		try {
			const cols = await listCollectionsFromDir(ws.dirHandle);
			const col = cols.find((c) => c.collection === collectionParam);
			if (!col) {
				goto("/workspace/local");
				return;
			}
			localCollection = col;
			whiteboards = await listWhiteboardsInCollection(ws.dirHandle, col.dirName);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (!browser || !collectionParam) return;
		const ws = $localWorkspaceStore;
		if (!ws) {
			goto("/workspace/local");
			return;
		}
		loadCollection();
	});

	afterNavigate(({ to }) => {
		if (browser && to?.url?.pathname?.startsWith("/workspace/local")) loadCollection();
	});

	function copyWhiteboardLink(id: string, e: MouseEvent, segment: string) {
		e.preventDefault();
		e.stopPropagation();
		if (!browser || !localWorkspace) return;
		const url = `${window.location.origin}${whiteboardRemoteUrl(localWorkspace.workspaceId, segment)}`;
		navigator.clipboard.writeText(url).then(
			() => {
				copyFeedbackId = id;
				setTimeout(() => (copyFeedbackId = null), 2000);
			},
			() => {},
		);
	}

	function anchorId(id: string) {
		return "del-" + id.replace(/[^a-zA-Z0-9_-]/g, "_");
	}

	function openWhiteboard(id: string, segment: string) {
		if (!localWorkspace) return;
		(async () => {
			const subdir = await localWorkspace!.dirHandle.getDirectoryHandle(localCollection!.dirName);
			const doc = await readSceneFromFile(subdir, id);
			const normalized = normalizeExcalidrawDoc(doc ?? { elements: [], files: {} });
			const internalRoomId = toInternalRoomIdLocal(localWorkspace!.workspaceId, segment);
			setLocalHostSession(internalRoomId, normalized, subdir, id);
			goto(whiteboardLocalUrl(segment));
		})();
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

	async function newWhiteboard() {
		if (!localWorkspace || !localCollection) return;
		const base = sanitizeWhiteboardName(newName) || `whiteboard-${Date.now()}`;
		showNewForm = false;
		newName = "";
		const subdir = await localWorkspace.dirHandle.getDirectoryHandle(localCollection.dirName);
		await writeSceneToFile(subdir, base, { elements: [], files: {} });
		whiteboards = [...whiteboards, { base, lastModified: Date.now() }].sort((a, b) => a.base.localeCompare(b.base));
		openWhiteboard(base, `${collectionParam}/${base}`);
	}

	async function deleteWhiteboard(id: string, sid: string) {
		hideConfirm(sid);
		if (!localWorkspace || !localCollection) return;
		try {
			const subdir = await localWorkspace.dirHandle.getDirectoryHandle(localCollection.dirName);
			await deleteExcalidrawFile(subdir, id);
			whiteboards = whiteboards.filter((w) => w.base !== id);
		} catch {}
	}

	async function removeFromCollection(id: string) {
		if (!localWorkspace || !localCollection) return;
		await moveFileFromCollection(localWorkspace.dirHandle, localCollection.dirName, id);
		whiteboards = whiteboards.filter((w) => w.base !== id);
	}

	async function deleteCollectionAction() {
		if (!localCollection) return;
		await deleteCollectionDir(localWorkspace!.dirHandle, localCollection.dirName);
		goto("/workspace/local");
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
		if (!localWorkspace || !localCollection) return;
		await renameCollectionDir(localWorkspace.dirHandle, localCollection.dirName, newCollection);
		goto(`/workspace/local/${newCollection}`);
		hideRenameCollection("col-" + oldCollection.replace(/[^a-zA-Z0-9_-]/g, "_"));
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

	async function doRenameWhiteboard(oldId: string, newName: string, sid: string) {
		const newBase = sanitizeWhiteboardName(newName.trim()) || oldId;
		if (newBase === oldId) return;
		if (!localWorkspace || !localCollection) return;
		const subdir = await localWorkspace.dirHandle.getDirectoryHandle(localCollection.dirName);
		await renameWhiteboardFile(subdir, oldId, newBase);
		whiteboards = whiteboards
			.map((w) => (w.base === oldId ? { base: newBase, lastModified: w.lastModified } : w))
			.sort((a, b) => a.base.localeCompare(b.base));
		hideRenameWhiteboard(sid);
	}
</script>

<svelte:head>
	<title>{localCollection?.collection ?? collectionParam} – Local – SVEX</title>
</svelte:head>

<div class="workspace-page">
	<div class="toolbar">
		<a href="/workspace/local">← Back to workspace</a>
		<h1>{localCollection?.collection ?? collectionParam}</h1>
		{#if localCollection}
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
					value={collectionParam}
					placeholder="e.g. meeting-notes"
					onRename={(newName) => doRenameCollection(collectionParam, newName)}
					onCancel={() => hideRenameCollection("col-" + collectionParam.replace(/[^a-zA-Z0-9_-]/g, "_"))}
				/>
			</div>
		{/if}
	</div>

	{#if loading}
		<p class="loading">Loading…</p>
	{:else if !localCollection}
		<p class="empty">Collection not found.</p>
	{:else}
		<div class="whiteboard-list">
			<div class="list-actions">
				{#if showNewForm}
					<div class="new-whiteboard-form">
						<label for="new-wb-name">Name (optional)</label>
						<input id="new-wb-name" type="text" placeholder="e.g. dash" bind:value={newName} onkeydown={(e) => e.key === "Enter" && newWhiteboard()} />
						<div class="new-form-actions">
							<button type="button" class="secondary" onclick={() => { showNewForm = false; newName = ""; }}>Cancel</button>
							<button type="button" class="primary" onclick={newWhiteboard}>Create</button>
						</div>
					</div>
				{:else}
					<button type="button" class="primary" onclick={() => (showNewForm = true)}>New whiteboard</button>
				{/if}
				<button type="button" class="secondary" onclick={() => loadCollection()} title="Refresh">Refresh</button>
			</div>

			{#if whiteboards.length === 0}
				<p class="empty">No whiteboards in this collection. Create one above.</p>
			{:else}
				<div class="preview-list preview-list-grid">
					{#each whiteboards as { base, lastModified }}
						{@const sid = anchorId(base)}
						{@const wbRenameSid = "wb-" + sid}
						{@const segment = `${collectionParam}/${base}`}
						{#snippet wbActions()}
							<button type="button" role="menuitem" onclick={(e) => copyWhiteboardLink(base, e, segment)}>{copyFeedbackId === base ? "Copied!" : "Copy link"}</button>
							<button type="button" role="menuitem" onclick={() => showRenameWhiteboard(wbRenameSid)}>Rename</button>
							<button type="button" role="menuitem" onclick={() => removeFromCollection(base)}>Remove from collection</button>
							<button type="button" role="menuitem" class="menu-item-danger" onclick={() => showConfirm(sid)}>Delete</button>
						{/snippet}
						<div style="anchor-name: --{wbRenameSid};">
							<PreviewCard
								variant="whiteboard"
								mode="workspace"
								name={base}
								updatedAt={lastModified || null}
								formatDateAgo={formatDateAgo}
								onclick={() => openWhiteboard(base, segment)}
								sid={sid}
								actions={wbActions}
							>
								{#snippet children()}
									<WhiteboardThumbnail
										getScene={async () => {
											if (!localWorkspace || !localCollection) return { elements: [], files: {} };
											const subdir = await localWorkspace.dirHandle.getDirectoryHandle(localCollection.dirName);
											const doc = await readSceneFromFile(subdir, base);
											return normalizeExcalidrawDoc(doc ?? { elements: [], files: {} });
										}}
										size="medium"
										aspectRatio="4/3"
									/>
								{/snippet}
							</PreviewCard>
							<RenamePopover
								sid={wbRenameSid}
								title="Rename whiteboard"
								value={base}
								placeholder="e.g. meeting-notes"
								onRename={(newName) => doRenameWhiteboard(base, newName, wbRenameSid)}
								onCancel={() => hideRenameWhiteboard(wbRenameSid)}
							/>
							<ConfirmPopover
								sid={sid}
								title="Delete this whiteboard?"
								onConfirm={() => deleteWhiteboard(base, sid)}
								onCancel={() => hideConfirm(sid)}
							/>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
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
	.loading,
	.empty {
		color: var(--muted);
		margin: 0 0 1rem 0;
	}
	.list-actions {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		flex-wrap: wrap;
	}
	.preview-list {
		list-style: none;
		padding: 0;
		margin: 0;
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
		background: var(--border);
		color: var(--text);
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 1rem;
	}
	.secondary:hover {
		background: var(--muted);
	}
	.new-whiteboard-form {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.new-whiteboard-form label {
		font-size: 0.9rem;
		color: var(--muted);
	}
	.new-whiteboard-form input {
		padding: 0.5rem 0.75rem;
		background: var(--border);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--text);
		font-size: 1rem;
	}
	.new-form-actions {
		display: flex;
		gap: 0.5rem;
	}
</style>
