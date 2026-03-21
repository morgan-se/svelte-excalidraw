<script lang="ts">
	import type { SecurityEvent } from "$lib/server/auth/security-events.js";

	let { data }: {
		data: {
			events: SecurityEvent[];
			byRouteOutcome: { route: string; outcome: string; count: number }[];
			counters: Record<string, number>;
		};
	} = $props();

	function formatTime(ts: number): string {
		return new Date(ts).toLocaleString();
	}
</script>

<h1>Security events</h1>

<div class="counters-section">
	<div class="card rate-limit-card">
		<h2>Rate-limit hits</h2>
		<p class="big">{data.counters.rate_limited ?? 0}</p>
	</div>
	<div class="card">
		<h2>Token abuse by route / outcome</h2>
		<table>
			<thead>
				<tr><th>Route</th><th>Outcome</th><th>Count</th></tr>
			</thead>
			<tbody>
				{#each data.byRouteOutcome as row}
					<tr>
						<td><code>{row.route}</code></td>
						<td>{row.outcome}</td>
						<td>{row.count}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if data.byRouteOutcome.length === 0}
			<p class="muted">No events yet.</p>
		{/if}
	</div>
</div>

<div class="action-form">
	<form method="POST" action="?/revokeUpgradeTokens" class="inline">
		<button type="submit" class="btn btn-danger">Revoke all upgrade tokens</button>
	</form>
	<form method="POST" action="?/revokeShareTokens" class="inline">
		<button type="submit" class="btn btn-danger">Revoke all share tokens</button>
	</form>
</div>

<article class="block">
	<h2>Recent events (redacted)</h2>
	<p class="muted">Last 200.</p>
	<table>
		<thead>
			<tr>
				<th>Time</th>
				<th>Type</th>
				<th>Route</th>
				<th>Outcome</th>
				<th>Identity</th>
			</tr>
		</thead>
		<tbody>
			{#each data.events as ev}
				<tr>
					<td>{formatTime(ev.timestamp)}</td>
					<td><code>{ev.type}</code></td>
					<td>{ev.route ?? "—"}</td>
					<td>{ev.outcome}</td>
					<td>{ev.identity ?? "—"}</td>
				</tr>
			{/each}
		</tbody>
	</table>
	{#if data.events.length === 0}
		<p class="muted">No events yet.</p>
	{/if}
</article>

<style>
	.counters-section {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}
	.rate-limit-card .big {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text);
		margin: 0;
	}
	.action-form {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}
</style>
