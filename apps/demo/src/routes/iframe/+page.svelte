<script lang="ts">
	import { browser } from "$app/environment";
	import { onMount, onDestroy } from "svelte";
	import type { RoomPush } from "svelte-excalidraw";

	const SOURCE = "excalidraw-iframe-demo";
	const ROOM_ID = "demo";

	type ElementLike = Readonly<Record<string, unknown>> & { id: string; version?: number; versionNonce?: number };
	type FileLike = { mimeType: string; id: string; dataURL: string; created?: number; lastRetrieved?: number };
	type Client = { userId: string; username: string; color?: { background: string; stroke: string }; source: MessageEventSource };

	let iframeTop: HTMLIFrameElement;
	let iframeBottom: HTMLIFrameElement;
	let clients: Map<string, Client> = new Map();
	let elements: ElementLike[] = [];
	let files: Record<string, FileLike> = {};
	let nextUserId = 1;
	/** userId -> who they are following (userId or null) */
	let currentFollowing: Map<string, string | null> = new Map();
	/** userId -> set of userIds that follow them */
	let followersOf: Map<string, Set<string>> = new Map();
	let handler: (e: MessageEvent) => void;

	function mergeElements(server: ElementLike[], incoming: readonly ElementLike[]): ElementLike[] {
		const byId = new Map<string, ElementLike>();
		for (const el of server) byId.set(el.id, { ...el });
		for (const el of incoming) {
			const existing = byId.get(el.id);
			const incV = Number(el.version ?? 0);
			const incN = Number(el.versionNonce ?? 0);
			const curV = existing ? Number((existing as ElementLike).version ?? 0) : 0;
			const curN = existing ? Number((existing as ElementLike).versionNonce ?? 0) : 0;
			if (!existing || incV > curV || (incV === curV && incN > curN)) {
				byId.set(el.id, { ...el });
			}
		}
		return Array.from(byId.values());
	}

	function collaboratorsRecord(): Record<string, { id: string; socketId: string; username: string; color?: { background: string; stroke: string } }> {
		const out: Record<string, { id: string; socketId: string; username: string; color?: { background: string; stroke: string } }> = {};
		clients.forEach((c, userId) => {
			out[userId] = { id: userId, socketId: userId, username: c.username, ...(c.color && { color: c.color }) };
		});
		return out;
	}

	function broadcast(payload: unknown, excludeSource?: MessageEventSource) {
		clients.forEach((c) => {
			if (c.source !== excludeSource && c.source && "postMessage" in c.source) {
				(c.source as Window).postMessage(payload, "*");
			}
		});
	}

	function sendTo(source: MessageEventSource | null | undefined, payload: unknown) {
		if (source && "postMessage" in source) (source as Window).postMessage(payload, "*");
	}

	function sendToUserId(userId: string, payload: unknown) {
		const c = clients.get(userId);
		if (c?.source && "postMessage" in c.source) (c.source as Window).postMessage(payload, "*");
	}

	onMount(() => {
		handler = (event: MessageEvent) => {
			const d = event.data;
			if (!d || d.source !== SOURCE || d.roomId !== ROOM_ID) return;

			switch (d.type) {
				case "join": {
					const userId = `user-${nextUserId++}`;
					const userInfo = d.userInfo as { username: string; color?: { background: string; stroke: string } };
					clients = new Map(clients);
					clients.set(userId, {
						userId,
						username: userInfo.username,
						color: userInfo.color,
						source: event.source!,
					});

					const collaborators = collaboratorsRecord();
					const collaborator = { id: userId, socketId: userId, username: userInfo.username, ...(userInfo.color && { color: userInfo.color }) };

					sendTo(event.source!, {
						source: SOURCE,
						type: "init",
						document: { elements, files },
						userId,
						collaborators,
					});

					broadcast({ source: SOURCE, type: "collaborator_joined", collaborator }, event.source ?? undefined);
					break;
				}
				case "push": {
				const userId = d.userId as string;
				const payload = d.payload as RoomPush;
				switch (payload.type) {
					case "elements": {
						const incoming = payload.elements as readonly ElementLike[];
						elements = mergeElements(elements, incoming);
						broadcast({ source: SOURCE, type: "elements", elements }, event.source ?? undefined);
						break;
					}
					case "files": {
						for (const [id, f] of Object.entries(payload.files)) {
							if (f && f.id && f.dataURL) files[id] = { ...f };
						}
						files = { ...files };
						broadcast({ source: SOURCE, type: "files", files }, undefined);
						break;
					}
					case "awareness":
						broadcast(
							{ source: SOURCE, type: "awareness", userId, awareness: payload.awareness },
							event.source ?? undefined,
						);
						break;
					case "viewport": {
						clients.forEach((c) => {
							if (currentFollowing.get(c.userId) === userId)
								sendTo(c.source, { source: SOURCE, type: "viewport", userId, sceneBounds: payload.sceneBounds });
						});
						break;
					}
					case "followState": {
						const followingUserId = payload.followingUserId;
						const prev = currentFollowing.get(userId) ?? null;
						currentFollowing = new Map(currentFollowing);
						currentFollowing.set(userId, followingUserId);
						if (prev) {
							const set = new Set(followersOf.get(prev) ?? []);
							set.delete(userId);
							followersOf = new Map(followersOf);
							if (set.size) followersOf.set(prev, set);
							else followersOf.delete(prev);
						}
						if (followingUserId) {
							const set = new Set(followersOf.get(followingUserId) ?? []);
							set.add(userId);
							followersOf = new Map(followersOf);
							followersOf.set(followingUserId, set);
						}
						const recipient = followingUserId ?? prev;
						if (recipient) {
							const followedBy = Array.from(followersOf.get(recipient) ?? []);
							sendToUserId(recipient, { source: SOURCE, type: "followed_by", followedBy });
						}
						break;
					}
					case "userInfo": {
						const c = clients.get(userId);
						if (c) {
							const userInfo = payload.userInfo;
							clients = new Map(clients);
							clients.set(userId, { ...c, username: userInfo.username, ...(userInfo.color && { color: userInfo.color }) });
							const collaborator = { id: userId, socketId: userId, username: userInfo.username, ...(userInfo.color && { color: userInfo.color }) };
							broadcast({ source: SOURCE, type: "collaborator_updated", collaborator }, event.source ?? undefined);
						}
						break;
					}
				}
					break;
				}
				case "leave": {
					const leftId = d.userId as string;
					const wasFollowing = currentFollowing.get(leftId) ?? null;
					if (wasFollowing) {
						const set = new Set(followersOf.get(wasFollowing) ?? []);
						set.delete(leftId);
						followersOf = new Map(followersOf);
						if (set.size) followersOf.set(wasFollowing, set);
						else followersOf.delete(wasFollowing);
					}
					const followers = followersOf.get(leftId);
					if (followers) {
						followersOf = new Map(followersOf);
						followersOf.delete(leftId);
					}
					currentFollowing = new Map(currentFollowing);
					currentFollowing.delete(leftId);
					clients = new Map(clients);
					clients.delete(leftId);
					broadcast({ source: SOURCE, type: "collaborator_left", userId: leftId });
					break;
				}
			}
		};
		window.addEventListener("message", handler);
	});

	onDestroy(() => {
		if (browser && handler) window.removeEventListener("message", handler);
	});
</script>

<svelte:head>
	<title>Multiplayer iframe demo – two canvases</title>
</svelte:head>

<div class="iframe-demo">
	<h1>Two iframes, one room (postMessage)</h1>
	<div class="iframes">
		<iframe
			bind:this={iframeTop}
			title="Top canvas"
			class="embed"
			src="/iframe/embed?slot=0"
		></iframe>
		<iframe
			bind:this={iframeBottom}
			title="Bottom canvas"
			class="embed"
			src="/iframe/embed?slot=1"
		></iframe>
	</div>
</div>

<style>
	.iframe-demo {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
	}
	.iframe-demo h1 {
		font-size: 1rem;
		margin: 0.5rem 0.75rem;
		flex-shrink: 0;
	}
	.iframes {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 1;
		min-height: 0;
		padding: 0 0.5rem 0.5rem;
	}
	.embed {
		flex: 1;
		min-height: 0;
		min-width: 0;
		border: 1px solid #ccc;
		border-radius: 8px;
		background: #fff;
	}
</style>
