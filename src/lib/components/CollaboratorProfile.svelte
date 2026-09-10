<script lang="ts">
	import CollaboratorColorDropdown from "./CollaboratorColorDropdown.svelte";
	import type { CollaboratorColorHex } from "../collaborator-colors.js";

	let {
		username = $bindable(""),
		color = $bindable(),
		placeholder = "Your name",
		label = "",
	}: {
		username?: string;
		color: CollaboratorColorHex;
		placeholder?: string;
		label?: string;
	} = $props();

	let colorMenuOpen = $state(false);
	const inputId = `collaborator-profile-${crypto.randomUUID()}`;
</script>

<div class="collaborator-profile">
	{#if label}
		<label class="collaborator-profile-label" for={inputId}>
			{label}
		</label>
	{/if}
	<input
		id={inputId}
		type="text"
		class="collaborator-profile-input"
		bind:value={username}
		{placeholder}
		aria-label="Your display name"
	/>
	<CollaboratorColorDropdown
		value={color}
		onSelect={(hex) => (color = hex)}
		open={colorMenuOpen}
		onOpenChange={(o) => (colorMenuOpen = o)}
	/>
</div>

<style>
	.collaborator-profile {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.collaborator-profile-label {
		font-size: 0.9rem;
		color: var(--collaborator-profile-muted, #a1a1aa);
	}
	.collaborator-profile-input {
		font-family: inherit;
		font-size: 0.9rem;
		padding: 0.35rem 0.6rem;
		border-radius: 6px;
		border: 1px solid var(--collaborator-profile-border, #27272a);
		background: var(--collaborator-profile-bg, #0f0f12);
		color: var(--collaborator-profile-text, #e4e4e7);
		width: 20ch;
		min-width: 8ch;
	}
	.collaborator-profile-input::placeholder {
		color: var(--collaborator-profile-muted, #a1a1aa);
	}
	.collaborator-profile-input:focus {
		outline: none;
		border-color: var(--collaborator-profile-accent, #fc6241);
	}
</style>
