<script lang="ts">
	import { goto } from "$app/navigation";
	import { listRooms, deleteRoom } from "$lib/excalidraw-room.remote.js";

	const roomsQuery = listRooms(undefined);
	const rooms = $derived(roomsQuery.current ?? []);

	const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
	function timeAgo(updatedAtMs: number): string {
		const diff = Date.now() - updatedAtMs;
		const sec = Math.floor(diff / 1000);
		const min = Math.floor(sec / 60);
		const hr = Math.floor(min / 60);
		const day = Math.floor(hr / 24);
		if (day > 0) return rtf.format(-day, "day");
		if (hr > 0) return rtf.format(-hr, "hour");
		if (min > 0) return rtf.format(-min, "minute");
		if (sec > 0) return rtf.format(-sec, "second");
		return rtf.format(0, "second");
	}

	function createRoomId(): string {
		return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
	}

	function createRoom() {
		goto(`/multiplayer/${createRoomId()}`);
	}

	let joinId = $state("");
	function joinRoom() {
		const id = joinId.trim();
		if (!id) return;
		goto(`/multiplayer/${encodeURIComponent(id)}`);
	}

	async function refreshRooms() {
		await roomsQuery.refresh();
	}

	let deleting = $state<string | null>(null);
	async function removeRoom(id: string, e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (deleting) return;
		deleting = id;
		try {
			await deleteRoom(id);
			await roomsQuery.refresh();
		} finally {
			deleting = null;
		}
	}
</script>

<svelte:head>
	<title>Excalidraw multiplayer – Rooms</title>
</svelte:head>

<div class="lobby-page">
	<div class="lobby">
		<h1>Multiplayer rooms</h1>
		<div class="actions">
			<button type="button" onclick={createRoom}>Create room</button>
			<div class="join">
				<input
					type="text"
					bind:value={joinId}
					placeholder="Room ID"
					onkeydown={(e) => e.key === "Enter" && joinRoom()}
				/>
				<button type="button" onclick={joinRoom}>Join room</button>
			</div>
		</div>
		<p class="hint">Create a room to get a link, or enter a room ID to join.</p>

		<section class="room-list">
			<div class="room-list-header">
				<h2>Rooms</h2>
				<button
					type="button"
					class="refresh-rooms"
					title="Refresh list"
					disabled={roomsQuery.loading}
					onclick={refreshRooms}
				>
					{roomsQuery.loading ? "…" : "↻"}
				</button>
			</div>
			{#if roomsQuery.loading && !roomsQuery.current}
				<p class="room-list-loading">Loading rooms…</p>
			{:else if rooms.length === 0}
				<p class="room-list-empty">No rooms. Create one or refresh to check again.</p>
			{:else}
				<ul>
					{#each rooms as room (room.id)}
						<li class="room-row">
							<a href="/multiplayer/{encodeURIComponent(room.id)}">{room.id}</a>
							<span class="room-ago" title={new Date(room.updatedAt).toLocaleString()}>
								{timeAgo(room.updatedAt)}
							</span>
							<button
								type="button"
								class="delete-room"
								title="Delete room"
								disabled={deleting === room.id}
								onclick={(e) => removeRoom(room.id, e)}
							>
								{deleting === room.id ? "…" : "×"}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>

<style>
	.lobby-page {
		display: flex;
		flex-direction: column;
		min-height: 0;
		flex: 1;
	}
	.lobby {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		padding: 1rem;
	}
	h1 {
		margin: 0;
		font-size: 1.5rem;
		color: #1e1e1e;
	}
	.actions {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}
	.actions > button {
		padding: 0.6rem 1.2rem;
		font-size: 1rem;
		cursor: pointer;
		background: #6965db;
		color: white;
		border: none;
		border-radius: 6px;
	}
	.actions > button:hover {
		background: #5854c9;
	}
	.join {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}
	.join input {
		padding: 0.5rem;
		min-width: 10rem;
	}
	.join button {
		padding: 0.5rem 1rem;
		cursor: pointer;
	}
	.room-list {
		width: 100%;
		max-width: 20rem;
	}
	.room-list-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}
	.room-list-header h2 {
		margin: 0;
		font-size: 1rem;
		color: #333;
	}
	.refresh-rooms {
		padding: 0.25rem 0.5rem;
		font-size: 1.1rem;
		line-height: 1;
		background: transparent;
		border: 1px solid #ccc;
		border-radius: 4px;
		cursor: pointer;
		color: #666;
	}
	.refresh-rooms:hover:not(:disabled) {
		background: #f0f0f0;
		border-color: #999;
		color: #333;
	}
	.refresh-rooms:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.room-list-loading,
	.room-list-empty {
		margin: 0;
		font-size: 0.9rem;
		color: #666;
	}
	.room-list ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.room-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.room-list a {
		flex: 1;
		min-width: 0;
		padding: 0.35rem 0;
		color: #6965db;
		text-decoration: none;
	}
	.room-ago {
		font-size: 0.85rem;
		color: #666;
		white-space: nowrap;
	}
	.room-list a:hover {
		text-decoration: underline;
	}
	.delete-room {
		padding: 0.2rem 0.4rem;
		font-size: 1.1rem;
		line-height: 1;
		background: transparent;
		border: 1px solid #ccc;
		border-radius: 4px;
		cursor: pointer;
		color: #666;
	}
	.delete-room:hover:not(:disabled) {
		background: #fee;
		border-color: #c33;
		color: #c33;
	}
	.delete-room:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.hint {
		margin: 0;
		font-size: 0.9rem;
		color: #666;
	}
</style>
