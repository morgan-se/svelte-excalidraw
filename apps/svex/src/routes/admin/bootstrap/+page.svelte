<script lang="ts">
	let { data }: { data: { form?: { success?: boolean; url?: string; expiresAt?: number } } } = $props();

	const bootstrapUrl = $derived(data.form?.url ?? null);
	const expiresAt = $derived(data.form?.expiresAt ?? null);
</script>

<h1>Bootstrap admin link</h1>
<p class="block-desc">
	Create a one-time, short-TTL (10 min) admin upgrade link. Show once in this session; never stored in logs or UI history.
</p>

{#if bootstrapUrl}
	<article class="block result">
		<p class="muted">Open this URL to become admin{expiresAt != null ? ` (expires ${new Date(expiresAt).toLocaleString()})` : ""}:</p>
		<code class="url">{bootstrapUrl}</code>
		<p class="warn">This is the only time it will be shown. Copy it now.</p>
	</article>
{:else}
	<form method="POST" action="?/create">
		<button type="submit" class="btn btn-primary">Generate bootstrap link</button>
	</form>
{/if}

<style>
	.result {
		max-width: 36rem;
	}
	.result .url {
		display: block;
		word-break: break-all;
		padding: 0.75rem 1rem;
		background: rgba(39, 39, 42, 0.8);
		border: 1px solid var(--border);
		border-radius: 8px;
		margin: 0 0 0.75rem 0;
		font-size: 0.9rem;
		color: var(--accent);
	}
	.result .warn {
		margin: 0;
		font-size: 0.85rem;
		color: var(--muted);
	}
</style>
