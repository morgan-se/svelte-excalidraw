<script lang="ts">
	import { getMultiplayerUser } from "./user-context.js";
	import MultiplayerUserPill from "./MultiplayerUserPill.svelte";

	let { backHref }: { backHref?: string } = $props();

	const user = getMultiplayerUser();
	const userInfo = $derived(user.userInfo);

	let editing = $state(false);
	let editUsername = $state("");
	let editColor = $state("");

	function startEditing() {
		if (userInfo) {
			editUsername = userInfo.username;
			editColor = userInfo.color?.background ?? user.colors[0];
			editing = true;
		}
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const username = editUsername.trim();
		if (username && editColor) {
			user.updateUser({
				username,
				color: user.colorToShape(editColor),
			});
			editing = false;
		}
	}
</script>

{#if userInfo}
	<div class="multiplayer-user-bar">
		{#if backHref}
			<a href={backHref} class="multiplayer-user-bar-back">← Rooms</a>
		{/if}
		{#if editing}
			<form class="multiplayer-user-edit" onsubmit={handleSubmit}>
				<input
					type="text"
					bind:value={editUsername}
					placeholder="Your name"
					required
					autocomplete="username"
				/>
				<fieldset class="multiplayer-user-swatches">
					<legend class="sr-only">Color</legend>
					{#each user.colors as hex}
						<label class="multiplayer-user-swatch">
							<input type="radio" bind:group={editColor} value={hex} />
							<span class="multiplayer-user-swatch-color" style="background-color: {hex}"></span>
						</label>
					{/each}
				</fieldset>
				<button type="submit">Save</button>
				<button type="button" onclick={() => (editing = false)}>Cancel</button>
			</form>
		{:else}
			<span class="multiplayer-user-you">
				You:
				<MultiplayerUserPill
					username={userInfo.username}
					backgroundColor={userInfo.color?.background ?? user.colors[0]}
				/>
			</span>
			<button type="button" class="multiplayer-user-edit-btn" onclick={startEditing} title="Change name and color">
				Edit
			</button>
		{/if}
	</div>
{/if}

<style>
	.multiplayer-user-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		background: #f5f5f5;
		border-bottom: 1px solid #e0e0e0;
		flex-shrink: 0;
	}
	.multiplayer-user-bar-back {
		font-size: 0.9rem;
		color: #6965db;
		text-decoration: none;
		margin-right: 0.5rem;
		padding: 0.25rem 0;
	}
	.multiplayer-user-bar-back:hover {
		text-decoration: underline;
	}
	.multiplayer-user-you {
		font-size: 0.9rem;
		color: #333;
	}
	.multiplayer-user-you :global(.multiplayer-user-pill) {
		margin-left: 0.25rem;
	}
	.multiplayer-user-edit-btn {
		padding: 0.25rem 0.5rem;
		font-size: 0.85rem;
		background: transparent;
		border: 1px solid #999;
		border-radius: 4px;
		cursor: pointer;
	}
	.multiplayer-user-edit-btn:hover {
		background: #eee;
	}
	.multiplayer-user-edit {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.multiplayer-user-edit input[type="text"] {
		padding: 0.35rem 0.5rem;
		min-width: 10rem;
	}
	.multiplayer-user-swatches {
		display: flex;
		flex-wrap: wrap;
		gap: 0.2rem;
		border: none;
		padding: 0;
		margin: 0;
	}
	.multiplayer-user-swatches .sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
	}
	.multiplayer-user-swatch {
		cursor: pointer;
		padding: 2px;
		border-radius: 4px;
		border: 2px solid transparent;
	}
	.multiplayer-user-swatch:has(input:checked) {
		border-color: #1e1e1e;
	}
	.multiplayer-user-swatch input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.multiplayer-user-swatch-color {
		display: block;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 3px;
	}
	.multiplayer-user-edit button[type="submit"] {
		padding: 0.35rem 0.6rem;
		background: #6965db;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}
	.multiplayer-user-edit button[type="button"] {
		padding: 0.35rem 0.6rem;
		background: transparent;
		border: 1px solid #999;
		border-radius: 4px;
		cursor: pointer;
	}
</style>
