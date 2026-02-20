<script lang="ts">
	import { browser } from "$app/environment";
	import { goto } from "$app/navigation";
	import { afterNavigate } from "$app/navigation";
	import { generateRoomCode } from "$lib/core/room-code.js";
	import { getLocalWorkspace, localWorkspaceStore, setLocalWorkspace } from "$lib/client/local/local-workspace.js";
	import { saveLocalDirToIndexedDB } from "$lib/client/local/local-dir-persistence.js";
	import { pickDirectory, isFsAccessSupported } from "$lib/client/fs-storage.js";
	import {
		listExcalidrawFilesWithDates,
		readSceneFromFile,
		writeSceneToFile,
		deleteExcalidrawFile,
		sanitizeWhiteboardName,
		normalizeExcalidrawDoc,
		listCollectionsFromDir,
		createCollectionDir,
		moveFileToCollection,
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
	import ConfirmPopover from "$lib/client/components/ConfirmPopover.svelte";
	import RenamePopover from "$lib/client/components/RenamePopover.svelte";
	import { showPopover } from "$lib/client/components/popover-utils.js";

	let localWorkspace = $state<{ workspaceId: string; dirHandle: FileSystemDirectoryHandle } | null>(null);
	let whiteboards = $state<{ base: string; lastModified: number }[]>([]);
	let collections = $state<LocalCollection[]>([]);
	let loading = $state(true);
	let loadError = $state<string | null>(null);
	let showNewForm = $state(false);
	let newName = $state("");
	let newCollectionSlug = $state("");
	let showNewCollection = $state(false);
	let copyFeedbackId = $state<string | null>(null);

	async function loadList() {
		if (!browser) return;
		const ws = getLocalWorkspace();
		if (!ws) {
			localWorkspace = null;
			loading = false;
			loadError = null;
			return;
		}
		localWorkspace = ws;
		loading = true;
		loadError = null;
		try {
			const { ensureLocalDbInFolder } = await import("$lib/client/local/local-db.js");
			await ensureLocalDbInFolder(ws.dirHandle);
			whiteboards = await listExcalidrawFilesWithDates(ws.dirHandle);
			collections = await listCollectionsFromDir(ws.dirHandle);
		} catch (e) {
			loadError = e instanceof Error ? e.message : String(e);
			whiteboards = [];
			collections = [];
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (!browser) return;
		const ws = $localWorkspaceStore;
		if (!ws) {
			localWorkspace = null;
			loading = false;
			return;
		}
		loadList();
	});

	afterNavigate(({ to }) => {
		if (browser && to?.url?.pathname === "/workspace/local") loadList();
	});

	function copyWhiteboardLink(id: string, e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (!browser || !localWorkspace) return;
		const url = `${window.location.origin}${whiteboardRemoteUrl(localWorkspace.workspaceId, id)}`;
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

	function openWhiteboard(id: string) {
		if (!localWorkspace) return;
		(async () => {
			const doc = await readSceneFromFile(localWorkspace!.dirHandle, id);
			const normalized = normalizeExcalidrawDoc(doc ?? { elements: [], files: {} });
			const internalRoomId = toInternalRoomIdLocal(localWorkspace!.workspaceId, id);
			setLocalHostSession(internalRoomId, normalized, localWorkspace!.dirHandle, id);
			goto(whiteboardLocalUrl(id));
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
		if (!localWorkspace) return;
		const base = slugifyCollectionName(newCollectionSlug.trim() || "col") || "col";
		const existing = new Set(collections.map((c) => c.collection));
		let collection = base;
		let n = 0;
		while (existing.has(collection)) collection = `${base}-${++n}`;
		await createCollectionDir(localWorkspace.dirHandle, collection);
		collections = await listCollectionsFromDir(localWorkspace.dirHandle);
		newCollectionSlug = "";
		showNewCollection = false;
		goto(`/workspace/local/${collection}`);
	}

	async function addToCollection(whiteboardId: string, dirName: string) {
		if (!localWorkspace) return;
		await moveFileToCollection(localWorkspace.dirHandle, dirName, whiteboardId);
		whiteboards = whiteboards.filter((w) => w.base !== whiteboardId);
		collections = await listCollectionsFromDir(localWorkspace.dirHandle);
	}

	async function deleteCollection(col: string) {
		if (!localWorkspace) return;
		const c = collections.find((x) => x.collection === col);
		if (c) {
			await deleteCollectionDir(localWorkspace.dirHandle, c.dirName);
			collections = await listCollectionsFromDir(localWorkspace.dirHandle);
			whiteboards = await listExcalidrawFilesWithDates(localWorkspace.dirHandle);
		}
	}

	async function newWhiteboard() {
		if (!localWorkspace) return;
		const base = sanitizeWhiteboardName(newName) || `whiteboard-${Date.now()}`;
		showNewForm = false;
		newName = "";
		await writeSceneToFile(localWorkspace.dirHandle, base, { elements: [], files: {} });
		whiteboards = [...whiteboards, { base, lastModified: Date.now() }].sort((a, b) => a.base.localeCompare(b.base));
		openWhiteboard(base);
	}

	async function deleteWhiteboard(id: string, sid: string) {
		hideConfirm(sid);
		if (!localWorkspace) return;
		try {
			await deleteExcalidrawFile(localWorkspace.dirHandle, id);
			whiteboards = whiteboards.filter((w) => w.base !== id);
			collections = await listCollectionsFromDir(localWorkspace.dirHandle);
		} catch {}
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
		if (!localWorkspace) return;
		const c = collections.find((x) => x.collection === oldCollection);
		if (c) {
			await renameCollectionDir(localWorkspace.dirHandle, c.dirName, newCollection);
			collections = await listCollectionsFromDir(localWorkspace.dirHandle);
			goto(`/workspace/local/${newCollection}`);
		}
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
		if (!localWorkspace) return;
		await renameWhiteboardFile(localWorkspace.dirHandle, oldId, newBase);
		whiteboards = whiteboards
			.map((w) => (w.base === oldId ? { base: newBase, lastModified: w.lastModified } : w))
			.sort((a, b) => a.base.localeCompare(b.base));
		collections = await listCollectionsFromDir(localWorkspace.dirHandle);
		hideRenameWhiteboard(sid);
	}

	async function openFolder() {
		const dir = await pickDirectory();
		if (!dir) return;
		const id = `remote-${generateRoomCode()}`;
		setLocalWorkspace(id, dir);
		await saveLocalDirToIndexedDB(id, dir);
		const { ensureLocalDbInFolder } = await import("$lib/client/local/local-db.js");
		await ensureLocalDbInFolder(dir);
	}
</script>

<svelte:head>
	<title>Local workspace – SVEX</title>
</svelte:head>

<div class="workspace-page">
	<div class="toolbar">
		<a href="/">← Back</a>
		<h1>Local workspace</h1>
	</div>

	{#if loading}
		<p class="loading">Loading…</p>
	{:else if loadError}
		<div class="load-error">
			<p class="load-error-msg">Error loading workspace: {loadError}</p>
			<p class="load-error-hint">Try clearing the stored folder and opening it again, or delete <code>db.sqlite</code> in your folder if it exists.</p>
			<div class="load-error-actions">
				<button type="button" class="secondary" onclick={() => { loadError = null; loadList(); }}>Retry</button>
				<button type="button" class="secondary" onclick={async () => { const { clearLocalDirFromIndexedDB } = await import("$lib/client/local/local-dir-persistence.js"); const { clearLocalWorkspace } = await import("$lib/client/local/local-workspace.js"); await clearLocalDirFromIndexedDB(); clearLocalWorkspace(); goto("/"); }}>Clear and reopen folder</button>
			</div>
		</div>
	{:else if !localWorkspace}
		<div class="pick-folder">
			{#if isFsAccessSupported()}
				<p class="pick-folder-desc">Open a folder on your computer to use it as your local workspace. Each whiteboard is a file; use [Copy] for the share link. No server storage.</p>
				<button type="button" class="primary" onclick={openFolder}>Open folder</button>
			{:else}
				<p class="pick-folder-unsupported">
					The File System Access API is not supported in this browser.
					<a href="https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API#browser_compatibility" target="_blank" rel="noopener noreferrer">Browser compatibility</a>.
				</p>
			{/if}
		</div>
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
				{#if showNewCollection}
					<div class="inline-form">
						<input type="text" placeholder="e.g. meeting-notes" bind:value={newCollectionSlug} onkeydown={(e) => e.key === "Enter" && createCollection()} />
						<button type="button" class="primary" onclick={createCollection}>Create</button>
						<button type="button" class="secondary" onclick={() => { showNewCollection = false; newCollectionSlug = ""; }}>Cancel</button>
					</div>
				{:else}
					<button type="button" class="secondary" onclick={() => (showNewCollection = true)}>New collection</button>
				{/if}
				<button type="button" class="secondary" onclick={() => loadList()} title="Refresh">Refresh</button>
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
									href="/workspace/local/{col.collection}"
									name={col.collection}
									count={n}
									sid={colSid}
									actions={colActions}
								>
									{#snippet children()}
										{#each (col.whiteboardIds ?? []).slice(0, 4) as wbId}
											<div class="preview-cell-inner">
												<WhiteboardThumbnail
													getScene={async () => {
														if (!localWorkspace) return { elements: [], files: {} };
														const subdir = await localWorkspace.dirHandle.getDirectoryHandle(col.dirName);
														const doc = await readSceneFromFile(subdir, String(wbId));
														return normalizeExcalidrawDoc(doc ?? { elements: [], files: {} });
													}}
													size="medium"
													aspectRatio="1"
												/>
											</div>
										{/each}
									{/snippet}
								</PreviewCard>
								<RenamePopover
									sid={colSid}
									title="Rename collection"
									value={col.collection}
									placeholder="e.g. meeting-notes"
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
						{#each whiteboards as { base, lastModified }}
							{@const sid = anchorId(base)}
							{@const wbRenameSid = "wb-" + sid}
							{#snippet wbActions()}
								<button type="button" role="menuitem" onclick={(e) => copyWhiteboardLink(base, e)}>{copyFeedbackId === base ? "Copied!" : "Copy link"}</button>
								<button type="button" role="menuitem" onclick={() => showRenameWhiteboard(wbRenameSid)}>Rename</button>
								{#if collections.length > 0}
									{#each collections as c}
										<button type="button" role="menuitem" onclick={() => addToCollection(base, c.dirName)}>Add to {c.collection}</button>
									{/each}
								{/if}
								<button type="button" role="menuitem" class="menu-item-danger" onclick={() => showConfirm(sid)}>Delete</button>
							{/snippet}
							<div style="anchor-name: --{wbRenameSid};">
								<PreviewCard
									variant="whiteboard"
									mode="workspace"
									name={base}
									updatedAt={lastModified || null}
									formatDateAgo={formatDateAgo}
									onclick={() => openWhiteboard(base)}
									sid={sid}
									actions={wbActions}
								>
									{#snippet children()}
										<WhiteboardThumbnail
											getScene={async () => {
												if (!localWorkspace) return { elements: [], files: {} };
												const doc = await readSceneFromFile(localWorkspace.dirHandle, base);
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
			</section>
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
	.loading,
	.empty {
		color: var(--muted);
		margin: 0 0 1rem 0;
	}
	.load-error {
		padding: 1.5rem;
		background: color-mix(in srgb, var(--error, #c00) 15%, transparent);
		border-radius: 8px;
		border: 1px solid var(--error, #c00);
	}
	.load-error-msg {
		margin: 0 0 0.5rem 0;
	}
	.load-error-hint {
		color: var(--muted);
		margin: 0 0 1rem 0;
		font-size: 0.9rem;
	}
	.load-error-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.load-error code {
		background: var(--border);
		padding: 0.1rem 0.3rem;
		border-radius: 4px;
	}
	.pick-folder {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 2rem;
		background: var(--border);
		border-radius: 12px;
		max-width: 28rem;
	}
	.pick-folder-desc {
		color: var(--muted);
		margin: 0;
		line-height: 1.5;
	}
	.pick-folder-unsupported {
		color: var(--muted);
		margin: 0;
		line-height: 1.5;
	}
	.pick-folder-unsupported a {
		color: var(--accent);
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
		align-items: flex-start;
	}
	.list-actions .new-whiteboard-form {
		flex: 1;
		min-width: 0;
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
		margin-top: 0.5rem;
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
