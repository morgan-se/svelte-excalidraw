<script lang="ts">
	import { browser } from "$app/environment";
	import { onDestroy, onMount } from "svelte";
	import Excalidraw from "./Excalidraw.svelte";
	import {
		reconcileElements,
		restoreElements,
		getVisibleSceneBounds,
		hashElementsVersion,
		zoomToFitBounds,
	} from "@excalidraw/excalidraw";
	import type {
		ExcalidrawImperativeAPI,
		ExcalidrawInitialDataState,
		Collaborator,
	} from "@excalidraw/excalidraw/types";
	import type { BinaryFiles } from "@excalidraw/excalidraw/types";
	import type {
		ExcalidrawMultiplayerAdapter,
		RoomUserInfo,
	} from "./multiplayer/types.js";
	import { applyCollaboratorEvent } from "./multiplayer/core/collaborators.js";
	import { startConnection } from "./multiplayer/core/connection.js";
	import { createMultiplayerSessionState } from "./multiplayer/core/state.svelte.js";
	import { createSyncPipeline } from "./multiplayer/core/sync.js";

	interface Props {
		roomId: string;
		userInfo: RoomUserInfo;
		adapter: ExcalidrawMultiplayerAdapter;
		theme?: "light" | "dark";
		UIOptions?: import("@excalidraw/excalidraw/types").AppProps["UIOptions"];
		/** When true, receive updates and show collaborators but do not push edits (view-only). */
		viewOnly?: boolean;
		/** Called when join fails (e.g. 403). Use to show "Access denied" and link. */
		onJoinError?: (error: unknown) => void;
	}

	let { roomId, userInfo, adapter, theme, UIOptions, viewOnly, onJoinError }: Props = $props();

	const session = createMultiplayerSessionState();
	let excalidrawAPI = $state<ExcalidrawImperativeAPI | undefined>(undefined);
	let lastUserInfoKey: string | null = null;
	let lastBroadcastedSceneVersion = 0;
	let connectionCleanup: (() => void) | null = null;
	let syncPipeline: ReturnType<typeof createSyncPipeline> | null = null;
	let roomClosed = $state(false);

	onMount(() => {
		if (!browser || !roomId) return;

		syncPipeline = createSyncPipeline({ adapter });

		startConnection({
			adapter,
			roomId,
			userInfo,
			callbacks: {
				onJoinError,
				onConnected(conn) {
					session.connection = conn;
				},
				onReady(cleanup) {
					connectionCleanup = cleanup;
				},
				onInitialData(doc) {
					lastBroadcastedSceneVersion = hashElementsVersion(doc.elements ?? []);
					session.resolveInitialData(doc);
				},
				onCollaboratorEvent(ev) {
					const next = applyCollaboratorEvent(session.collaborators, ev);
					if (next !== session.collaborators) {
						session.collaborators = next;
						excalidrawAPI?.updateScene({ collaborators: next });
					}
				},
				onElements(elements) {
					const api = excalidrawAPI;
					if (!api) return;
					const local = api.getSceneElementsIncludingDeleted();
					const appState = api.getAppState();
					const restored = restoreElements(elements, null);
					const reconciled = reconcileElements(local, restored, appState);
					// Mark this version so the next onChange (from updateScene) won't re-push it.
					// Use = not max: we only avoid echoing this exact state; next local edit has different hash.
					lastBroadcastedSceneVersion = hashElementsVersion(reconciled);
					api.updateScene({ elements: reconciled });
				},
				onFiles(files) {
					const api = excalidrawAPI;
					if (!api) return;
					const filesList = Object.values(
						files as Record<string, unknown>,
					) as Parameters<ExcalidrawImperativeAPI["addFiles"]>[0];
					if (filesList.length > 0) api.addFiles(filesList);
				},
				onFollowedBy(followedBy) {
					const api = excalidrawAPI;
					if (!api) return;
					const appState = api.getAppState();
					api.updateScene({
						appState: { ...appState, followedBy: new Set(followedBy) },
					});
				},
				onViewport(userId, sceneBounds) {
					const api = excalidrawAPI;
					if (!api) return;
					const appState = api.getAppState();
					if (appState.userToFollow?.socketId !== userId) return;
					api.updateScene({
						appState: zoomToFitBounds({
							appState,
							bounds: sceneBounds,
							fitToViewport: true,
							viewportZoomFactor: 1,
						}).appState,
					});
				},
				onRoomClosed() {
					roomClosed = true;
				},
			},
		});
	});

	onDestroy(() => {
		connectionCleanup?.();
		syncPipeline?.cleanup();
		session.connection = null;
	});

	// Sync current user’s profile (name/color/avatar) to the backend and into collaborators when it changes.
	$effect(() => {
		const conn = session.connection;
		if (!conn) return;
		const nextInfo = userInfo;
		const key = JSON.stringify({
			username: nextInfo.username,
			color: nextInfo.color ?? null,
			avatarUrl: nextInfo.avatarUrl ?? null,
		});
		if (key === lastUserInfoKey) return;
		lastUserInfoKey = key;
		adapter.push(roomId, conn.userId, { type: "userInfo", userInfo: nextInfo });
		const next = new Map(session.collaborators);
		const existing =
			next.get(conn.userId) ??
			({ id: conn.userId, socketId: conn.userId } as Collaborator);
		next.set(conn.userId, {
			...existing,
			username: nextInfo.username,
			...(nextInfo.color && { color: nextInfo.color }),
			...(nextInfo.avatarUrl && { avatarUrl: nextInfo.avatarUrl }),
			isCurrentUser: true,
		});
		session.collaborators = next;
	});

	// Push collaborators into Excalidraw’s scene so cursors/labels stay in sync.
	$effect(() => {
		if (!excalidrawAPI || !session.collaborators) return;
		excalidrawAPI.updateScene({ collaborators: session.collaborators });
	});

	// Forward follow/unfollow from Excalidraw to the adapter so the backend can broadcast follow state.
	$effect(() => {
		const api = excalidrawAPI;
		const conn = session.connection;
		if (!api || !conn) return;
		const unsub = api.onUserFollow(
			(payload: {
				userToFollow: { socketId: string };
				action: "FOLLOW" | "UNFOLLOW";
			}) => {
				adapter.push(roomId, conn.userId, {
					type: "followState",
					followingUserId: payload.action === "FOLLOW" ? payload.userToFollow?.socketId ?? null : null,
				});
			},
		);
		return unsub;
	});
</script>

{#if roomClosed}
	<div class="host-left-message">
		<p>Host left. The room is closed.</p>
	</div>
{:else}
<Excalidraw
	bind:excalidrawAPI
	initialData={session.initialData}
	isCollaborating={true}
	viewModeEnabled={viewOnly ?? false}
	{theme}
	{UIOptions}
	onChange={(elements, _appState, files) => {
		if (viewOnly) return;
		const sceneVersion = hashElementsVersion(elements);
		// Skip only if we already pushed this exact version (avoid duplicate push).
		if (sceneVersion === lastBroadcastedSceneVersion) return;
		lastBroadcastedSceneVersion = sceneVersion;
		const conn = session.connection;
		if (!conn || !syncPipeline) return;
		syncPipeline.handleElementsChange(roomId, conn.userId, elements);
		if (files) {
			syncPipeline.handleFilesChange(roomId, conn.userId, files);
		}
	}}
	onPointerUpdate={(update) => {
		const conn = session.connection;
		if (!conn || !syncPipeline) return;
		syncPipeline.handlePointerUpdate(roomId, conn.userId, {
			pointer: update.pointer,
			button: update.button,
			selectedElementIds: excalidrawAPI?.getAppState().selectedElementIds,
		});
	}}
	onScrollChange={(_scrollX: number, _scrollY: number) => {
		const conn = session.connection;
		if (!conn || !excalidrawAPI || !syncPipeline) return;
		const appState = excalidrawAPI.getAppState();
		if (appState.userToFollow?.socketId) return;
		if (appState.followedBy.size === 0) return;
		const sceneBounds = getVisibleSceneBounds(appState);
		syncPipeline.handleViewportChange(roomId, conn.userId, sceneBounds);
	}}
/>
{/if}

<style>
	.host-left-message {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 200px;
		padding: 2rem;
		background: var(--color-bg-container, #1e1e1e);
		color: var(--color-text-primary, #eee);
		border-radius: 8px;
	}
	.host-left-message p {
		margin: 0;
		font-size: 1rem;
	}
</style>