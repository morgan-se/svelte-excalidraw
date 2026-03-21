<script lang="ts">
	import type { OverviewStats } from "$lib/server/admin/data.js";

	let { data }: { data: { stats: OverviewStats } } = $props();
</script>

<h1>Admin overview</h1>

<div class="cards">
	<div class="card">
		<h2>Sessions</h2>
		<p>Guest: <strong>{data.stats.sessionCounts.guest}</strong></p>
		<p>Trusted: <strong>{data.stats.sessionCounts.trusted}</strong></p>
		<p>Admin: <strong>{data.stats.sessionCounts.admin}</strong></p>
	</div>
	<div class="card">
		<h2>Rooms & workspaces</h2>
		<p>Workspace whiteboards: <strong>{data.stats.whiteboardCount}</strong></p>
		<p>Ephemeral rooms: <strong>{data.stats.ephemeralCount}</strong></p>
		<p>Workspaces: <strong>{data.stats.workspaceCount}</strong></p>
	</div>
	<div class="card">
		<h2>Security (since startup)</h2>
		<p>Join consumed: <strong>{data.stats.counts.join_token_consumed ?? 0}</strong></p>
		<p>Join invalid: <strong>{data.stats.counts.join_token_invalid ?? 0}</strong></p>
		<p>Login claim consumed: <strong>{data.stats.counts.login_claim_consumed ?? 0}</strong></p>
		<p>Login claim invalid: <strong>{data.stats.counts.login_claim_invalid ?? 0}</strong></p>
		<p>Upgrade consumed: <strong>{data.stats.counts.upgrade_consumed ?? 0}</strong></p>
		<p>Upgrade invalid: <strong>{data.stats.counts.upgrade_invalid ?? 0}</strong></p>
		<p>Rate limited: <strong>{data.stats.counts.rate_limited ?? 0}</strong></p>
	</div>
	<div class="card">
		<h2>Last 24h</h2>
		<p>Joins: <strong>{data.stats.countsLast24h.join_token_consumed ?? 0}</strong> / invalid <strong>{data.stats.countsLast24h.join_token_invalid ?? 0}</strong></p>
		<p>Login claims: <strong>{data.stats.countsLast24h.login_claim_consumed ?? 0}</strong> / invalid <strong>{data.stats.countsLast24h.login_claim_invalid ?? 0}</strong></p>
		<p>Upgrades: <strong>{data.stats.countsLast24h.upgrade_consumed ?? 0}</strong> / invalid <strong>{data.stats.countsLast24h.upgrade_invalid ?? 0}</strong></p>
		<p>Rate limited: <strong>{data.stats.countsLast24h.rate_limited ?? 0}</strong></p>
	</div>
	<div class="card">
		<h2>Top failures (24h)</h2>
		{#if data.stats.topFailures.length > 0}
			{#each data.stats.topFailures as { type, count }}
				<p><code>{type}</code>: <strong>{count}</strong></p>
			{/each}
		{:else}
			<p class="muted">None</p>
		{/if}
	</div>
</div>

<style>
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
		gap: 1rem;
	}
</style>
