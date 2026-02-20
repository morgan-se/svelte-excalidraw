<script lang="ts">
	import { goto } from "$app/navigation";
	import { createWorkspace } from "$lib/svex.remote.js";

	let slug = $state("");
	let error = $state("");
	let creating = $state(false);

	async function create() {
		const s = slug.trim().toLowerCase();
		if (!s) {
			error = "Enter a URL slug (e.g. my-team)";
			return;
		}
		creating = true;
		error = "";
		try {
			const result = await createWorkspace(s);
			if ("error" in result) {
				error = result.error;
				return;
			}
			goto(`/workspace/${result.workspaceId}`);
		} finally {
			creating = false;
		}
	}
</script>

<svelte:head>
	<title>New workspace – SVEX</title>
</svelte:head>

<div class="new-workspace">
	<div class="toolbar">
		<a href="/">← Back</a>
		<h1>New workspace</h1>
	</div>
	<p class="hint">Choose a vanity URL for your workspace (e.g. <strong>my-team</strong> → /workspace/my-team).</p>
	<form class="form" onsubmit={(e) => { e.preventDefault(); create(); }}>
		<label>
			<span>URL slug</span>
			<input
				type="text"
				bind:value={slug}
				placeholder="my-team"
				pattern="[a-z0-9]([a-z0-9\-])*[a-z0-9]|[a-z0-9]"
				title="Letters, numbers, hyphens; 2–50 chars"
			/>
		</label>
		{#if error}
			<p class="error">{error}</p>
		{/if}
		<button type="submit" class="primary" disabled={creating}>
			{creating ? "Creating…" : "Create workspace"}
		</button>
	</form>
</div>

<style>
	.new-workspace {
		max-width: 28rem;
		margin: 0 auto;
		padding: 1.5rem 1rem;
	}
	.toolbar {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.toolbar a {
		color: var(--accent);
	}
	.toolbar h1 {
		margin: 0;
		font-size: 1.25rem;
	}
	.hint {
		color: var(--muted);
		margin: 0 0 1rem 0;
		font-size: 0.95rem;
	}
	.form label {
		display: block;
		margin-bottom: 0.5rem;
	}
	.form label span {
		display: block;
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
	}
	.form input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: var(--border);
		border: 1px solid var(--border);
		color: var(--text);
		border-radius: 6px;
		font-size: 1rem;
	}
	.form .error {
		color: var(--accent);
		margin: 0.5rem 0 0 0;
		font-size: 0.9rem;
	}
	.form .primary {
		margin-top: 1rem;
		background: var(--accent);
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 1rem;
	}
	.form .primary:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}
</style>
