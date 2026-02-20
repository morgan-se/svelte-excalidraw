<script lang="ts">
	import { browser } from "$app/environment";
	import { ExcalidrawMultiplayer } from "svelte-excalidraw";
	import { profileStore } from "$lib/client/client-state.js";
	import { createSvexAdapter, StreamForbiddenError } from "$lib/client/svex-adapter.js";
	import { createShareLink, refreshEphemeralRoom, leaveEphemeralRoom, deleteEphemeralRoom } from "$lib/svex.remote.js";
	import { goto } from "$app/navigation";
	import { COLLABORATOR_COLORS } from "$lib/core/collaborator-colors.js";
	import UserProfileWidget from "$lib/client/components/UserProfileWidget.svelte";
	import type { WorkspaceKind } from "$lib/core/types/workspace-types.js";
	import type { SessionData } from "$lib/core/types/session-types.js";
	import type { ConfigFlags } from "$lib/config.js";

	interface Props {
		workspaceId: string;
		segmentId: string;
		internalRoomId: string;
		access?: "read" | "readWrite";
		streamUrl: () => string;
		getJoinExtras?: (rid: string) => { workspaceKind?: WorkspaceKind; initialDocument?: { elements: unknown[]; files: Record<string, unknown> } };
		backHref: string;
		displayId: string;
		title: string;
		isEphemeral?: boolean;
		isEphemeralCreator?: boolean;
		ephemeralTtlHours?: number;
		accessDeniedMessage?: string;
		accessDeniedHref?: string;
		/** When set, show single "Copy link" that copies this URL (e.g. remote/local host) */
		shareUrlOverride?: string;
		/** When false, hide share buttons (e.g. remote guest) */
		showShareButtons?: boolean;
		/** Effect for local host sync; return cleanup */
		syncEffect?: () => (() => void) | void;
		session?: SessionData;
		flags?: ConfigFlags;
	}

	let {
		workspaceId,
		segmentId,
		internalRoomId,
		access = "readWrite",
		streamUrl,
		getJoinExtras,
		backHref,
		displayId,
		title,
		isEphemeral = false,
		isEphemeralCreator = false,
		ephemeralTtlHours,
		accessDeniedMessage,
		accessDeniedHref,
		shareUrlOverride,
		showShareButtons = true,
		syncEffect,
		session,
		flags,
	}: Props = $props();

	const isReadOnly = $derived(access === "read");

	const adapter = createSvexAdapter({
		streamUrl: (_rid) => streamUrl(),
		getJoinExtras: getJoinExtras ? (rid) => getJoinExtras(rid) : undefined,
	});

	let joinError = $state<"forbidden" | null>(null);
	function onJoinError(error: unknown) {
		if (error instanceof StreamForbiddenError || (error && typeof error === "object" && "code" in error && error.code === "FORBIDDEN")) {
			joinError = "forbidden";
		}
	}

	const profile = $derived($profileStore);
	const userInfo = $derived({
		username: profile.username?.trim() || "Guest",
		color: profile.color && (COLLABORATOR_COLORS as readonly string[]).includes(profile.color)
			? { background: profile.color, stroke: profile.color }
			: { background: COLLABORATOR_COLORS[0]!, stroke: COLLABORATOR_COLORS[0]! },
	});

	let copyFeedback = $state<"read" | "edit" | "url" | "">("");
	async function copyShareLink(linkAccess: "read" | "readWrite") {
		if (shareUrlOverride) {
			try {
				await navigator.clipboard.writeText(shareUrlOverride);
				copyFeedback = "url";
				setTimeout(() => (copyFeedback = ""), 2000);
			} catch {}
			return;
		}
		const result = await createShareLink({
			workspaceId,
			roomId: segmentId,
			access: linkAccess,
		});
		if ("error" in result) return;
		try {
			await navigator.clipboard.writeText(result.url);
			copyFeedback = linkAccess === "read" ? "read" : "edit";
			setTimeout(() => (copyFeedback = ""), 2000);
		} catch {}
	}

	$effect(() => syncEffect?.());

	async function refreshTtl() {
		if (!isEphemeral || !segmentId) return;
		const ok = await refreshEphemeralRoom(segmentId);
		if (ok) window.location.reload();
	}

	async function leaveOrDeleteEphemeral() {
		if (!isEphemeral || !segmentId) return;
		if (isEphemeralCreator) {
			await deleteEphemeralRoom(segmentId);
		} else {
			await leaveEphemeralRoom(segmentId);
		}
		goto("/");
	}
</script>

<svelte:head>
	<title>{title} – SVEX</title>
</svelte:head>

<div class="whiteboard-page">
	<div class="toolbar">
		<a href={isReadOnly ? "/" : backHref}>← Back</a>
		<span class="whiteboard-id">{displayId}</span>
		{#if isReadOnly}
			<span class="toolbar-badge">View only</span>
			{#if isEphemeral}
				<button type="button" class="toolbar-leave" onclick={leaveOrDeleteEphemeral}>Leave room</button>
			{/if}
		{:else if showShareButtons}
			{#if shareUrlOverride}
				<button type="button" class="toolbar-copy" onclick={() => copyShareLink("readWrite")} title="Copy share link">
					{copyFeedback === "url" ? "Copied!" : "Copy link"}
				</button>
			{:else}
				<button type="button" class="toolbar-copy" onclick={() => copyShareLink("read")} title="Copy read-only link">
					{copyFeedback === "read" ? "Copied!" : "Copy view link"}
				</button>
				<button type="button" class="toolbar-copy" onclick={() => copyShareLink("readWrite")} title="Copy edit link">
					{copyFeedback === "edit" ? "Copied!" : "Copy edit link"}
				</button>
			{/if}
		{/if}
		<UserProfileWidget session={session} showSessionMenu={!!session} showLabel={true} flags={flags} />
		{#if !isReadOnly && isEphemeral}
			<button type="button" onclick={refreshTtl}>Refresh (extend {ephemeralTtlHours}h)</button>
			<button type="button" class="toolbar-leave" onclick={leaveOrDeleteEphemeral}>
				{isEphemeralCreator ? "Delete room" : "Leave room"}
			</button>
		{/if}
	</div>
	{#if joinError === "forbidden" && accessDeniedMessage}
		<div class="access-denied">
			<p>{accessDeniedMessage}</p>
			{#if accessDeniedHref}
				<p><a href={accessDeniedHref}>Open workspace to get access</a>, then try the link again.</p>
			{/if}
		</div>
	{:else if internalRoomId && userInfo.username}
		<div class="canvas-wrap">
			<ExcalidrawMultiplayer {adapter} roomId={internalRoomId} userInfo={userInfo} theme="dark" viewOnly={isReadOnly} onJoinError={onJoinError} />
		</div>
	{/if}
</div>

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
	.toolbar-badge {
		font-size: 0.8rem;
		color: var(--muted);
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		background: var(--border);
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
	.access-denied {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 2rem;
		text-align: center;
		color: var(--text);
	}
	.access-denied a {
		color: var(--accent);
	}
	.canvas-wrap {
		flex: 1;
		min-height: 0;
	}
</style>
