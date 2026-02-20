<script lang="ts">
	import { browser } from "$app/environment";
	import { page } from "$app/stores";
	import { ExcalidrawMultiplayer } from "svelte-excalidraw";
	import { createSvexAdapter } from "$lib/client/svex-adapter.js";
	import { writeSceneToFile, type ExcalidrawDoc } from "$lib/client/fs-storage.js";
	import { getLocalHostSession } from "$lib/client/local/local-host-session.js";
	import { getLocalWorkspace } from "$lib/client/local/local-workspace.js";
	import { toInternalRoomIdLocal } from "$lib/client/local/local-room-id.js";
	import { profileStore } from "$lib/client/client-state.js";
	import { getRoomScene, createShareLink } from "$lib/svex.remote.js";
	import { COLLABORATOR_COLORS } from "$lib/core/collaborator-colors.js";
	import { whiteboardLocalUrl } from "$lib/core/whiteboard-url.js";
	import UserProfileWidget from "$lib/client/components/UserProfileWidget.svelte";

	let { data } = $props();

	const segmentId = $derived.by(() => {
		const { collection, roomId } = $page.params;
		return (collection && roomId ? `${collection}/${roomId}` : roomId) ?? "";
	});

	const ws = $derived(browser ? getLocalWorkspace() : null);
	const internalRoomId = $derived.by(() => {
		if (!ws) return "";
		return toInternalRoomIdLocal(ws.workspaceId, segmentId);
	});

	const adapter = createSvexAdapter({
		streamUrl: () => whiteboardLocalUrl(segmentId),
		getJoinExtras(rid) {
			const session = getLocalHostSession(rid);
			if (session) {
				return {
					workspaceKind: "local",
					initialDocument: {
						elements: Array.isArray(session.doc.elements) ? session.doc.elements : [],
						files: session.doc.files && typeof session.doc.files === "object" ? session.doc.files : {},
					},
				};
			}
			return { workspaceKind: "forever" };
		},
	});

	const profile = $derived($profileStore);
	const userInfo = $derived({
		username: profile.username?.trim() || "Guest",
		color: profile.color && (COLLABORATOR_COLORS as readonly string[]).includes(profile.color)
			? { background: profile.color, stroke: profile.color }
			: { background: COLLABORATOR_COLORS[0]!, stroke: COLLABORATOR_COLORS[0]! },
	});

	const backHref = $derived(
		segmentId.includes("/")
			? `/workspace/local/${segmentId.split("/")[0]}`
			: "/workspace/local",
	);
	let copyFeedback = $state<"read" | "edit" | "">("");
	async function copyShareLink(linkAccess: "read" | "readWrite") {
		if (!ws) return;
		const result = await createShareLink({
			workspaceId: ws.workspaceId,
			roomId: segmentId,
			access: linkAccess,
			kind: "local",
		});
		if ("error" in result) return;
		try {
			await navigator.clipboard.writeText(result.url);
			copyFeedback = linkAccess === "read" ? "read" : "edit";
			setTimeout(() => (copyFeedback = ""), 2000);
		} catch {}
	}

	$effect(() => {
		if (!browser || !internalRoomId) return;
		const session = getLocalHostSession(internalRoomId);
		if (!session) return;
		const interval = setInterval(async () => {
			try {
				const doc = await getRoomScene(internalRoomId);
				await writeSceneToFile(session.dirHandle, session.filenameBase, doc as ExcalidrawDoc);
			} catch {
				// ignore
			}
		}, 2000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Whiteboard local/{segmentId} – SVEX</title>
</svelte:head>

{#if !ws}
	<div class="whiteboard-page">
		<p class="no-workspace">
			No local workspace. <a href="/">Open a folder</a> first.
		</p>
	</div>
{:else if internalRoomId && userInfo.username}
	<div class="whiteboard-page">
		<div class="toolbar">
			<a href={backHref}>← Back</a>
			<span class="whiteboard-id">local/{segmentId}</span>
			<button type="button" class="toolbar-copy" onclick={() => copyShareLink("read")} title="Copy read-only link">
				{copyFeedback === "read" ? "Copied!" : "Copy view link"}
			</button>
			<button type="button" class="toolbar-copy" onclick={() => copyShareLink("readWrite")} title="Copy edit link">
				{copyFeedback === "edit" ? "Copied!" : "Copy edit link"}
			</button>
			<UserProfileWidget session={data?.session} showSessionMenu={!!data?.session} showLabel={true} flags={data?.flags} />
		</div>
		<div class="canvas-wrap">
			<ExcalidrawMultiplayer {adapter} roomId={internalRoomId} userInfo={userInfo} theme="dark" />
		</div>
	</div>
{/if}

<style>
	.whiteboard-page {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}
	.toolbar {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.5rem 1rem;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
		background: var(--bg);
		color: var(--text);
	}
	.toolbar a {
		color: var(--accent);
	}
	.whiteboard-id {
		font-family: monospace;
		font-size: 0.9rem;
	}
	.toolbar-copy {
		background: var(--border);
		border: none;
		border-radius: 4px;
		color: var(--text);
		padding: 0.25rem 0.5rem;
		font-size: 0.9rem;
		cursor: pointer;
	}
	.toolbar-copy:hover {
		background: var(--muted);
	}
	.canvas-wrap {
		flex: 1;
		min-height: 0;
	}
	.no-workspace {
		padding: 2rem;
		color: var(--muted);
	}
	.no-workspace a {
		color: var(--accent);
	}
</style>
