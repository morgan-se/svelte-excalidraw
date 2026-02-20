<script lang="ts">
	import { browser } from "$app/environment";
	import { replaceState } from "$app/navigation";
	import { page } from "$app/state";
	import { getRandomUsername } from "@excalidraw/random-username";
	import {
		ExcalidrawMultiplayer,
		createDefaultAdapter,
		CollaboratorProfile,
		COLLABORATOR_COLORS,
		type CollaboratorColorHex,
	} from "svelte-excalidraw";
	import {
		generateRoomCode,
		normalizeRoomCode,
		isValidRoomCode,
	} from "./room-code.js";

	const STORAGE_KEY_ROOM = "svelte-excalidraw-landing-room";
	const STORAGE_KEY_USER = "svelte-excalidraw-landing-user";

	function colorToShape(hex: string) {
		return { background: hex, stroke: hex };
	}

	/** When URL has no room, returns fallback so we don't generate a new code every time (avoids effect loop). Prefer hash then query, then sessionStorage. Uses window.location so we see hash after replaceState. */
	function getRoomFromUrl(fallback: string): string {
		if (!browser) return fallback;
		const hash = window.location.hash.slice(1);
		if (hash.startsWith("room=")) {
			const code = normalizeRoomCode(hash.slice(5)).slice(0, 6);
			if (code) return code;
		} else if (hash.length >= 1) {
			const code = normalizeRoomCode(hash).slice(0, 6);
			if (code.length >= 1) return code;
		}
		const fromQuery = new URLSearchParams(window.location.search).get("room");
		if (fromQuery) return normalizeRoomCode(fromQuery).slice(0, 6) || fallback;
		try {
			const stored = sessionStorage.getItem(STORAGE_KEY_ROOM);
			if (stored && isValidRoomCode(stored)) return stored;
		} catch {}
		return fallback;
	}

	function saveRoomToStorage(roomId: string) {
		if (!browser || roomId === "------") return;
		try {
			sessionStorage.setItem(STORAGE_KEY_ROOM, roomId);
		} catch {}
	}

	function setRoomInUrl(roomId: string) {
		if (!browser) return;
		const url = page.url.pathname + page.url.search + "#" + roomId;
		// Use replaceState so the URL updates synchronously; goto() is async and the sync effect would overwrite the new room
		replaceState(url, page.state);
	}

	const adapter = createDefaultAdapter({
		streamUrl: () => "/",
	});

	const PLACEHOLDER_NO_ROOM = "------";
	const initialRoom = getRoomFromUrl(PLACEHOLDER_NO_ROOM);
	const initialRoomResolved =
		initialRoom === PLACEHOLDER_NO_ROOM ? PLACEHOLDER_NO_ROOM : initialRoom;
	let roomId = $state(initialRoomResolved);
	let roomInput = $state(initialRoomResolved);
	let username = $state("");
	let colorHex = $state<CollaboratorColorHex>(COLLABORATOR_COLORS[0]);
	let userHydrated = $state(false);

	const userInfo = $derived({
		username: username.trim() || "Guest",
		color: colorToShape(colorHex),
	});

	function syncRoomFromUrl() {
		const fromUrl = getRoomFromUrl(roomId);
		if (fromUrl !== roomId) {
			roomId = fromUrl;
			roomInput = fromUrl;
			saveRoomToStorage(fromUrl);
			if (fromUrl !== PLACEHOLDER_NO_ROOM) setRoomInUrl(fromUrl);
		} else if (roomId === PLACEHOLDER_NO_ROOM && browser) {
			const code = generateRoomCode();
			roomId = code;
			roomInput = code;
			setRoomInUrl(code);
			saveRoomToStorage(code);
		} else if (roomId !== PLACEHOLDER_NO_ROOM && browser) {
			// Room came from sessionStorage (no hash in URL); put hash in URL so it's shareable
			const hash = window.location.hash.slice(1);
			const hashRoom =
				hash.startsWith("room=")
					? normalizeRoomCode(hash.slice(5)).slice(0, 6)
					: hash.length >= 1
						? normalizeRoomCode(hash).slice(0, 6)
						: "";
			if (hashRoom !== roomId) setRoomInUrl(roomId);
		}
	}

	function connectToRoom() {
		const code = normalizeRoomCode(roomInput).slice(0, 6);
		if (code.length < 1) return;
		// Update URL first so the sync effect sees the new hash and doesn't overwrite roomId
		setRoomInUrl(code);
		saveRoomToStorage(code);
		roomId = code;
		roomInput = code;
	}

	function saveUserToStorage() {
		if (!browser) return;
		try {
			sessionStorage.setItem(
				STORAGE_KEY_USER,
				JSON.stringify({ username: username.trim(), color: colorHex }),
			);
		} catch {}
	}

	function generateNewRoom() {
		const code = generateRoomCode();
		setRoomInUrl(code);
		saveRoomToStorage(code);
		roomId = code;
		roomInput = code;
	}

	let copiedUrl = $state(false);
	async function copyRoomUrl() {
		if (!browser || roomId === PLACEHOLDER_NO_ROOM) return;
		try {
			await navigator.clipboard.writeText(window.location.href);
			copiedUrl = true;
			setTimeout(() => (copiedUrl = false), 2000);
		} catch {}
	}

	$effect(() => {
		if (!browser) return;
		syncRoomFromUrl();
	});

	$effect(() => {
		if (browser && !roomInput) {
			roomInput = roomId;
		}
	});

	// Hydrate username/color from sessionStorage or use Excalidraw random name (once per session)
	$effect(() => {
		if (!browser || userHydrated) return;
		userHydrated = true;
		try {
			const raw = sessionStorage.getItem(STORAGE_KEY_USER);
			if (raw) {
				const parsed = JSON.parse(raw) as { username?: string; color?: string };
				const name = parsed?.username?.trim();
				const hex = parsed?.color;
				if (name && hex && COLLABORATOR_COLORS.includes(hex as CollaboratorColorHex)) {
					username = name;
					colorHex = hex as CollaboratorColorHex;
					return;
				}
			}
		} catch {}
		username = getRandomUsername();
		colorHex = COLLABORATOR_COLORS[Math.floor(Math.random() * COLLABORATOR_COLORS.length)]!;
		sessionStorage.setItem(
			STORAGE_KEY_USER,
			JSON.stringify({ username, color: colorHex }),
		);
	});

	// Persist username/color changes to sessionStorage
	$effect(() => {
		if (!browser || !userHydrated) return;
		saveUserToStorage();
	});
</script>

<div class="landing-excal">
	<div class="landing-bar">
		<div class="landing-bar-user">
			{#if userHydrated}
				<CollaboratorProfile
					bind:username
					bind:color={colorHex}
					label="You:"
					placeholder="Your name"
				/>
			{:else}
				<span class="landing-bar-you landing-bar-you-placeholder">…</span>
			{/if}
		</div>
		<div class="landing-bar-room">
			<label for="room-input" class="landing-bar-room-label">Room</label>
			<input
				id="room-input"
				type="text"
				class="landing-bar-room-input"
				bind:value={roomInput}
				onkeydown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						connectToRoom();
					}
				}}
				maxlength="6"
				placeholder="1–6 chars"
				autocomplete="off"
			/>
			<button type="button" class="landing-bar-room-go" onclick={connectToRoom}>
				Go
			</button>
			<button type="button" class="landing-bar-room-new" onclick={generateNewRoom} title="New room">
				New
			</button>
			{#if roomId !== PLACEHOLDER_NO_ROOM}
				<button
					type="button"
					class="landing-bar-room-copy"
					onclick={copyRoomUrl}
					title="Copy URL to open in another tab or share"
				>
					{copiedUrl ? "Copied!" : "Copy URL"}
				</button>
			{/if}
		</div>
	</div>
	<div class="landing-canvas">
		<div class="landing-canvas-inner">
			{#if roomId !== PLACEHOLDER_NO_ROOM && userHydrated}
				{#key roomId}
					<ExcalidrawMultiplayer
						{adapter}
						{roomId}
						{userInfo}
						theme="dark"
					/>
				{/key}
			{:else}
				<div class="landing-canvas-loading">
					{roomId === PLACEHOLDER_NO_ROOM ? "Connecting to room…" : "Loading…"}
				</div>
			{/if}
		</div>
	</div>
	<p class="landing-note">
		State is in memory only; when everyone leaves the room it’s cleared. Copy the URL to open in another tab or share to collaborate.
	</p>
</div>

<style>
	.landing-excal {
		display: flex;
		flex-direction: column;
		gap: 0;
		border: 1px solid var(--border, #27272a);
		border-radius: 8px;
		overflow: hidden;
		background: var(--code-bg, #18181b);
	}
	.landing-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		background: var(--bg, #0f0f12);
		border-bottom: 1px solid var(--border, #27272a);
		flex-shrink: 0;
	}
	.landing-bar-user {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.landing-bar-you {
		font-size: 0.9rem;
		color: var(--muted, #a1a1aa);
	}
	.landing-bar-you-placeholder {
		opacity: 0.6;
	}
	.landing-bar-room {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}
	.landing-bar-room-label {
		font-size: 0.8rem;
		color: var(--muted, #a1a1aa);
	}
	.landing-bar-room-input {
		width: 5rem;
		padding: 0.3rem 0.4rem;
		font-family: ui-monospace, monospace;
		font-size: 0.9rem;
		letter-spacing: 0.05em;
		text-transform: lowercase;
		background: var(--code-bg, #18181b);
		border: 1px solid var(--border, #27272a);
		border-radius: 4px;
		color: var(--text, #e4e4e7);
	}
	.landing-bar-room-input::placeholder {
		color: var(--muted, #a1a1aa);
	}
	.landing-bar-room-go,
	.landing-bar-room-new,
	.landing-bar-room-copy {
		padding: 0.3rem 0.5rem;
		font-size: 0.8rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}
	.landing-bar-room-copy {
		background: var(--accent, #fc6241);
		color: white;
	}
	.landing-bar-room-go,
	.landing-bar-room-new {
		background: transparent;
		color: var(--muted, #a1a1aa);
		border: 1px solid var(--border, #27272a);
	}
	.landing-bar-room-go:hover,
	.landing-bar-room-new:hover,
	.landing-bar-room-copy:hover {
		color: var(--text, #e4e4e7);
	}
	.landing-bar-room-copy:hover {
		color: white;
		opacity: 0.9;
	}
	.landing-canvas {
		height: 500px;
		min-height: 400px;
		width: 100%;
	}
	.landing-canvas-inner {
		height: 100%;
		width: 100%;
	}
	.landing-canvas-inner :global(> *) {
		height: 100%;
		width: 100%;
	}
	.landing-canvas-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		min-height: 400px;
		color: var(--muted, #a1a1aa);
		font-size: 0.9rem;
	}
	.landing-note {
		margin: 0;
		padding: 0.4rem 0.75rem;
		font-size: 0.75rem;
		color: var(--muted, #a1a1aa);
		border-top: 1px solid var(--border, #27272a);
	}
</style>
