<script lang="ts">
	import { browser } from "$app/environment";
	import { goto, invalidateAll } from "$app/navigation";
	import { generateRoomCode } from "$lib/core/room-code.js";
	import {
		pickDirectory,
		isFsAccessSupported,
		listExcalidrawFilesWithDates,
		listCollectionsFromDir,
		readSceneFromFile,
		normalizeExcalidrawDoc,
		type LocalCollection,
	} from "$lib/client/fs-storage.js";
	import { get } from "svelte/store";
	import {
		setLocalWorkspace,
		localWorkspaceStore,
		clearLocalWorkspace,
	} from "$lib/client/local/local-workspace.js";
	import {
		saveLocalDirToIndexedDB,
		clearLocalDirFromIndexedDB,
	} from "$lib/client/local/local-dir-persistence.js";
	import {
		sessionAddEphemeral,
		sessionRemoveEphemeral,
		deleteEphemeralRoom,
		leaveEphemeralRoom,
		leaveWorkspace,
	} from "$lib/svex.remote.js";
	import UserProfileWidget from "$lib/client/components/UserProfileWidget.svelte";
	import WhiteboardThumbnail from "$lib/client/components/WhiteboardThumbnail.svelte";
	import PreviewCard from "$lib/client/components/PreviewCard.svelte";
	import ActionsMenu from "$lib/client/components/ActionsMenu.svelte";
	import ConfirmPopover from "$lib/client/components/ConfirmPopover.svelte";
	import { showPopover } from "$lib/client/components/popover-utils.js";
	let { data } = $props();
	const flags = $derived(data.flags);

	const ttlHours = $derived(flags.ephemeralTtlHours);
	const ttlMs = $derived(ttlHours * 60 * 60 * 1000);
	const hasLocal = $derived(browser && !!$localWorkspaceStore);
	const localFolderName = $derived(
		$localWorkspaceStore?.dirHandle?.name ?? null,
	);

	const workspacePreviews = $derived((data?.workspacePreviews ?? []) as { workspaceId: string; collections: { collection: string; whiteboardIds: string[] }[]; rootWhiteboardIds: string[] }[]);
	const ephemeralRoomMetas = $derived((data?.ephemeralRoomMetas ?? {}) as Record<string, number | null>);
	const recentEphemeralWithRemaining = $derived.by(() => {
		const rooms = data?.session?.ephemeralRooms ?? [];
		const grants = data?.session?.ephemeralGrants ?? {};
		const metas = ephemeralRoomMetas;
		const now = Date.now();
		const byId = new Map<string, { id: string; lastUpdatedAt: number | null; access: "read" | "readWrite"; isCreator: boolean }>();
		for (const { id, lastUpdatedAt } of rooms) {
			byId.set(id, {
				id,
				lastUpdatedAt: lastUpdatedAt ?? metas[id] ?? null,
				access: grants[id] ?? "readWrite",
				isCreator: true,
			});
		}
		for (const id of Object.keys(grants)) {
			if (!byId.has(id)) {
				byId.set(id, {
					id,
					lastUpdatedAt: metas[id] ?? null,
					access: grants[id]!,
					isCreator: false,
				});
			}
		}
		return [...byId.values()].map(({ id, lastUpdatedAt, access, isCreator }) => {
			const remainingHours =
				lastUpdatedAt != null
					? (lastUpdatedAt + ttlMs - now) / (60 * 60 * 1000)
					: null;
			return { id, remainingHours, access, isCreator };
		});
	});

	$effect(() => {
		if (!browser) return;
		let removed = false;
		for (const { id, remainingHours } of recentEphemeralWithRemaining) {
			if (remainingHours !== null && remainingHours <= 0) {
				sessionRemoveEphemeral(id);
				removed = true;
			}
		}
		if (removed) invalidateAll();
	});

	function formatRemaining(hours: number | null): string {
		if (hours === null) return "NULL";
		if (hours <= 0) return "Expired";
		if (hours < 1) return `${Math.round(hours * 60)}m left`;
		return `${Math.round(hours)}h left`;
	}

	const epConfirmCleanups = new Map<string, () => void>();
	const wsLeaveConfirmCleanups = new Map<string, () => void>();

	async function createEphemeralWhiteboard() {
		const id = generateRoomCode();
		await sessionAddEphemeral({ id, lastUpdatedAt: Date.now() });
		goto(`/whiteboard/ephemeral/${id}`);
	}

	let localPreview = $state<{ whiteboards: { base: string }[]; collections: LocalCollection[] } | null>(null);
	let localPreviewLoading = $state(false);

	$effect(() => {
		if (!browser) return;
		const ws = $localWorkspaceStore;
		if (!ws) {
			localPreview = null;
			return;
		}
		let cancelled = false;
		localPreviewLoading = true;
		(async () => {
			try {
				const [whiteboards, collections] = await Promise.all([
					listExcalidrawFilesWithDates(ws.dirHandle),
					listCollectionsFromDir(ws.dirHandle),
				]);
				if (cancelled) return;
				localPreview = { whiteboards, collections };
			} catch {
				if (!cancelled) localPreview = null;
			} finally {
				if (!cancelled) localPreviewLoading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	/** Preview items: root whiteboards (1 thumb) + collections (up to 2 thumbs). */
	const localPreviewItems = $derived.by(() => {
		if (!localPreview) return [];
		type RootItem = { type: "root"; base: string };
		type ColItem = { type: "collection"; collection: string; dirName: string; ids: string[]; count: number };
		const items: (RootItem | ColItem)[] = [];
		for (const w of localPreview.whiteboards.slice(0, 4)) {
			items.push({ type: "root", base: w.base });
		}
		for (const col of localPreview.collections) {
			if (col.whiteboardIds.length > 0) {
				items.push({
					type: "collection",
					collection: col.collection,
					dirName: col.dirName,
					ids: col.whiteboardIds.slice(0, 2),
					count: col.whiteboardIds.length,
				});
			}
		}
		return items;
	});

	async function openFolder() {
		const dir = await pickDirectory();
		if (!dir) return;
		const workspaceId = `remote-${generateRoomCode()}`;
		setLocalWorkspace(workspaceId, dir);
		await saveLocalDirToIndexedDB(workspaceId, dir);
		goto("/workspace/local");
	}

</script>

<svelte:head>
	<title>SVEX – Whiteboards that sync</title>
</svelte:head>

<div class="landing">
	<header class="hero">
		<h1 class="logo">SVEX</h1>
		<p class="hero-tag">
			Collaborative whiteboards. Use a folder on your machine, a temporary
			room, or a permanent workspace.
		</p>
		{#if browser}
			<div class="hero-profile">
				<span class="hero-profile-label">You are</span>
				<UserProfileWidget session={data?.session} showSessionMenu={true} flags={data?.flags} />
			</div>
		{/if}
	</header>

	<section class="main">
		{#if flags.ephemeralEnabled}
			<article class="block">
				<div class="block-head">
					<div class="block-title-row">
						<span class="block-icon" aria-hidden="true">⚡</span>
						<h2>Ephemeral room</h2>
					</div>
					{#if flags.canCreateEphemeral}
						<button
							type="button"
							class="btn btn-primary"
							onclick={createEphemeralWhiteboard}>New</button
						>
					{:else}
						<span class="block-badge">Joined rooms only</span>
					{/if}
				</div>
				<p class="block-desc">
					One room, <strong>{ttlHours}h</strong> from last activity. No
					sign-up. Share the link; visiting the room extends the timer.
				</p>
				<div class="preview-grid">
					{#each recentEphemeralWithRemaining.filter((x) => x.remainingHours === null || x.remainingHours > 0) as { id, remainingHours, access, isCreator }}
						{@const epSid = "ep-" + id.replace(/[^a-zA-Z0-9_-]/g, "_")}
						{#snippet epActions()}
							{#if isCreator}
								<button type="button" role="menuitem" class="menu-item-danger" onclick={(e) => { e.preventDefault(); e.stopPropagation(); epConfirmCleanups.get(epSid)?.(); epConfirmCleanups.set(epSid, showPopover("confirm-" + epSid)); }}>Delete</button>
							{:else}
								<button type="button" role="menuitem" onclick={(e) => { e.preventDefault(); e.stopPropagation(); leaveEphemeralRoom(id).then(() => invalidateAll()); }}>Leave</button>
							{/if}
						{/snippet}
						<div class="preview-grid-item">
							<PreviewCard
								variant="ephemeral"
								href="/whiteboard/ephemeral/{id}"
								name={id}
								{remainingHours}
								{access}
								{formatRemaining}
								ephemeralBadge={isCreator ? "created" : "joined"}
								sid={epSid}
								actions={epActions}
							>
								{#snippet children()}
									<WhiteboardThumbnail
										ephemeralId={id}
										size="medium"
										aspectRatio="4/3"
									/>
								{/snippet}
							</PreviewCard>
							{#if isCreator}
								<ConfirmPopover
									sid={epSid}
									title="Delete this room?"
									onConfirm={async () => { epConfirmCleanups.get(epSid)?.(); epConfirmCleanups.delete(epSid); await deleteEphemeralRoom(id); invalidateAll(); }}
									onCancel={() => { epConfirmCleanups.get(epSid)?.(); epConfirmCleanups.delete(epSid); }}
								/>
							{/if}
						</div>
					{/each}
				</div>
			</article>
		{/if}

		{#if flags.localEnabled}
			<article class="block">
				<div class="block-head">
					<div class="block-title-row">
						<span class="block-icon" aria-hidden="true">📂</span>
						<h2>Local workspace</h2>
					</div>
					{#if isFsAccessSupported()}
						<div class="block-actions-row">
							<button
								type="button"
								class="btn btn-primary"
								onclick={openFolder}>{hasLocal ? "Change folder" : "Open folder"}</button>
							{#if hasLocal}
								<button
									type="button"
									class="btn btn-close"
									onclick={async () => { clearLocalWorkspace(); await clearLocalDirFromIndexedDB(); invalidateAll(); }}
									title="Close folder"
									aria-label="Close folder"
								>✕</button>
							{/if}
						</div>
					{/if}
				</div>
				{#if !isFsAccessSupported()}
					<p class="block-desc block-unsupported-notice">
						The File System Access API is not supported in this browser.
						<a href="https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API#browser_compatibility" target="_blank" rel="noopener noreferrer">Browser compatibility</a>.
					</p>
				{:else}
					<p class="block-desc">
						Use a folder on your computer. Each whiteboard is a file;
						use [Copy] for the share link. No server storage.
					</p>
				{/if}
				{#if hasLocal}
					<div class="workspace-preview-column">
						<a href="/workspace/local" class="workspace-preview-card">
							<div class="workspace-preview-row">
								{#if localPreviewLoading}
									{#each Array(4) as _}
										<div class="preview-card preview-card-placeholder">
											<div class="preview-card-thumb"></div>
											<div class="preview-card-label"><span class="preview-card-type"></span><span class="preview-card-name"></span></div>
										</div>
									{/each}
								{:else}
									{#each localPreviewItems as item}
										{#if item.type === "root"}
											<PreviewCard variant="whiteboard" name={item.base}>
												{#snippet children()}
													<WhiteboardThumbnail
														getScene={async () => {
															const ws = get(localWorkspaceStore);
															if (!ws) return { elements: [], files: {} };
															const doc = await readSceneFromFile(ws.dirHandle, item.base);
															return normalizeExcalidrawDoc(doc ?? { elements: [], files: {} });
														}}
														size="medium"
														aspectRatio="4/3"
													/>
												{/snippet}
											</PreviewCard>
										{:else}
											<PreviewCard variant="collection" name={item.collection} count={item.count}>
												{#snippet children()}
													{#each item.ids as base}
														<div class="preview-cell-inner">
															<WhiteboardThumbnail
																getScene={async () => {
																	const ws = get(localWorkspaceStore);
																	if (!ws) return { elements: [], files: {} };
																	const subdir = await ws.dirHandle.getDirectoryHandle(item.dirName);
																	const doc = await readSceneFromFile(subdir, base);
																	return normalizeExcalidrawDoc(doc ?? { elements: [], files: {} });
																}}
																size="medium"
																aspectRatio="1"
															/>
														</div>
													{/each}
												{/snippet}
											</PreviewCard>
										{/if}
									{/each}
								{/if}
							</div>
							<span class="workspace-preview-name">{localFolderName ?? "Local folder"}</span>
						</a>
					</div>
				{/if}
			</article>
		{/if}

		{#if flags.workspaceEnabled}
			<article class="block">
				<div class="block-head">
					<div class="block-title-row">
						<span class="block-icon" aria-hidden="true">◇</span>
						<h2>Persistent workspace</h2>
					</div>
					{#if flags.canCreateWorkspace}
						<a href="/workspace/new" class="btn btn-primary"
							>New workspace</a
						>
					{/if}
				</div>
				{#if flags.workspaceSelfHostedHint}
					<p class="block-desc">
						<a href="https://svelte-excalidraw.tips.dev/svex/self-hosted" target="_blank" rel="noopener noreferrer">Self-host SVEX</a> to get your own persistent workspaces. If you'd rather not self-host, we recommend official Excalidraw workspaces at <a href="https://plus.excalidraw.com" target="_blank" rel="noopener noreferrer">plus.excalidraw.com</a>.
					</p>
				{:else}
					<p class="block-desc">
						Create a named workspace with a custom URL. Add as many
						whiteboards as you like; they don't expire.
					</p>
				{/if}
				{#if workspacePreviews.length > 0}
					<div class="workspace-preview-column">
						{#each workspacePreviews as preview}
							{@const wsSid = "ws-" + preview.workspaceId.replace(/[^a-zA-Z0-9_-]/g, "_")}
							{@const items = (() => {
								type RootItem = { type: "root"; id: string };
								type ColItem = { type: "collection"; collection: string; ids: string[]; count: number };
								const out: (RootItem | ColItem)[] = [];
								for (const id of preview.rootWhiteboardIds.slice(0, 4)) out.push({ type: "root", id });
								for (const c of preview.collections) {
									if (c.whiteboardIds.length > 0) {
										out.push({
											type: "collection",
											collection: c.collection,
											ids: c.whiteboardIds.slice(0, 2),
											count: c.whiteboardIds.length,
										});
									}
								}
								return out;
							})()}
							<div class="workspace-preview-item">
								<a href="/workspace/{preview.workspaceId}" class="workspace-preview-card">
									<ActionsMenu sid={wsSid}>
										{#snippet children()}
											<button type="button" role="menuitem" class="menu-item-danger" onclick={(e) => { e.preventDefault(); e.stopPropagation(); wsLeaveConfirmCleanups.get(wsSid)?.(); wsLeaveConfirmCleanups.set(wsSid, showPopover("confirm-" + wsSid)); }}>Leave workspace</button>
										{/snippet}
									</ActionsMenu>
									<div class="workspace-preview-row">
										{#each items as item}
											{#if item.type === "root"}
												<PreviewCard variant="whiteboard" name={item.id}>
													{#snippet children()}
														<WhiteboardThumbnail
															workspaceId={preview.workspaceId}
															whiteboardId={item.id}
															size="medium"
															aspectRatio="4/3"
														/>
													{/snippet}
												</PreviewCard>
											{:else}
												<PreviewCard variant="collection" name={item.collection} count={item.count}>
													{#snippet children()}
														{#each item.ids as id}
															<div class="preview-cell-inner">
																<WhiteboardThumbnail
																	workspaceId={preview.workspaceId}
																	whiteboardId={id}
																	collection={item.collection}
																	size="medium"
																	aspectRatio="1"
																/>
															</div>
														{/each}
													{/snippet}
												</PreviewCard>
											{/if}
										{/each}
									</div>
									<span class="workspace-preview-name">{preview.workspaceId}</span>
								</a>
								<ConfirmPopover
									sid={wsSid}
									title="Leave this workspace?"
									confirmLabel="Leave"
									onConfirm={async () => { wsLeaveConfirmCleanups.get(wsSid)?.(); wsLeaveConfirmCleanups.delete(wsSid); await leaveWorkspace(preview.workspaceId); invalidateAll(); }}
									onCancel={() => { wsLeaveConfirmCleanups.get(wsSid)?.(); wsLeaveConfirmCleanups.delete(wsSid); }}
								/>
							</div>
						{/each}
					</div>
				{/if}
			</article>
		{/if}
	</section>

	<footer class="footer">
		<p>
			<a
				href="https://github.com/tips-services/svelte-excalidraw"
				target="_blank"
				rel="noopener noreferrer">GitHub</a
			>
			·
			<a href="https://svelte-excalidraw.tips.dev/svex">SVEX docs</a>
		</p>
		<p>
			By <a
				href="https://tips.dev"
				target="_blank"
				rel="noopener noreferrer">tips.dev</a
			>. Not affiliated with <a
			href="https://plus.excalidraw.com"
			target="_blank"
			rel="noopener noreferrer">Excalidraw</a
		>.
		</p>
	</footer>
</div>

<style>
	.landing {
		font-family: var(--font-sans);
		min-height: 100vh;
		max-width: 52rem;
		margin: 0 auto;
		padding-top: .5rem;
		padding: 2rem 1rem;
		background: radial-gradient(
				ellipse 120% 80% at 50% -20%,
				rgba(252, 98, 65, 0.08),
				transparent
			),
			var(--bg);
	}
	.hero {
		text-align: center;
		margin-bottom: clamp(1.5rem, 4vw, 2.5rem);
	}
	.logo {
		font-size: clamp(2.5rem, 10vw, 4rem);
		font-weight: 700;
		letter-spacing: -0.04em;
		margin: 0;
		background: linear-gradient(135deg, var(--text) 0%, var(--muted) 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
	.hero-tag {
		font-size: clamp(1rem, 2.5vw, 1.2rem);
		color: var(--muted);
		margin: 0.75rem 0 0 0;
		font-weight: 500;
	}
	.hero-profile {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin-top: 1.25rem;
		padding: 0.6rem 1rem;
		background: rgba(24, 24, 27, 0.5);
		border: 1px solid var(--border);
		border-radius: 10px;
		inline-size: fit-content;
		margin-inline: auto;
	}
	.hero-profile-label {
		font-size: 0.9rem;
		color: var(--muted);
	}
	.main {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 2rem;
	}
	.block {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		background: rgba(24, 24, 27, 0.6);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 1rem 1.25rem;
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
	}
	.block:hover {
		border-color: rgba(252, 98, 65, 0.4);
		box-shadow: 0 0 0 1px rgba(252, 98, 65, 0.1);
	}
	.block-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.25rem;
	}
	.block-title-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.block-head .btn-primary {
		flex-shrink: 0;
	}
	.block-actions-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.btn-close {
		font-family: inherit;
		font-size: 1rem;
		line-height: 1;
		padding: 0.35rem 0.5rem;
		background: transparent;
		color: var(--muted);
		border: 1px solid var(--border);
		border-radius: 6px;
		cursor: pointer;
	}
	.btn-close:hover {
		color: var(--accent);
		border-color: var(--accent);
	}
	.block-icon {
		font-size: 1.5rem;
		opacity: 0.9;
	}
	.block h2 {
		font-size: 1.1rem;
		font-weight: 600;
		margin: 0;
	}
	.block-desc {
		font-size: 0.9rem;
		color: var(--muted);
		margin: 0 0 0.75rem 0;
		line-height: 1.5;
	}
	.block-desc a {
		color: var(--accent);
	}
	.block-badge {
		font-size: 0.85rem;
		color: var(--muted);
		padding: 0.25rem 0.5rem;
		background: var(--border);
		border-radius: 6px;
	}
	.preview-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		grid-auto-rows: min-content;
		gap: 0.75rem;
		align-items: start;
		align-content: start;
		height: fit-content;
	}
	.preview-grid-item {
		position: relative;
	}
	.preview-card-placeholder {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.35rem;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid var(--border);
		border-radius: 6px;
		flex: 1 1 10rem;
		min-width: 8rem;
		max-width: 14rem;
	}
	.preview-card-placeholder .preview-card-thumb {
		background: var(--muted);
		opacity: 0.4;
		min-height: 4rem;
		border-radius: 4px;
		aspect-ratio: 4 / 3;
	}
	.preview-card-placeholder .preview-card-label {
		visibility: hidden;
	}
	.workspace-preview-column {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.workspace-preview-item {
		position: relative;
	}
	.workspace-preview-card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0;
		background: var(--border);
		border: 1px solid transparent;
		border-radius: 8px;
		color: var(--text);
		text-decoration: none;
		overflow: hidden;
		transition:
			border-color 0.15s,
			transform 0.15s,
			background 0.15s;
	}
	.workspace-preview-card:hover {
		background: rgba(39, 39, 42, 0.8);
		border-color: var(--accent);
		transform: translateY(-1px);
	}
	.workspace-preview-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		width: 100%;
		min-height: 6rem;
	}
	.workspace-preview-name {
		padding: 0.5rem 0.75rem;
		font-weight: 600;
		font-size: 1rem;
	}
	.btn {
		font-family: inherit;
		font-size: 0.95rem;
		font-weight: 500;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		cursor: pointer;
		transition:
			opacity 0.15s,
			transform 0.15s;
	}
	.btn:hover {
		opacity: 0.95;
	}
	.btn:active {
		transform: scale(0.98);
	}
	.btn-primary {
		background: var(--accent);
		color: white;
		border: none;
	}
	.btn-primary:hover {
		opacity: 1;
		filter: brightness(1.05);
	}
	.landing a {
		text-decoration: none;
	}
	.landing a:hover {
		text-decoration: underline;
	}
	.footer {
		padding-top: 1.5rem;
		border-top: 1px solid var(--border);
		font-size: 0.85rem;
		color: var(--muted);
	}
	.footer a {
		color: var(--accent);
	}
	.footer a:hover {
		text-decoration: underline;
	}
	.footer p {
		margin: 0;
	}
</style>
