<script lang="ts">
	import type { SessionRow } from "$lib/server/admin/data.js";

	let { data }: { data: { sessions: SessionRow[]; sessionCounts: { guest: number; trusted: number; admin: number } } } = $props();

	function formatTime(ts: number | null): string {
		if (ts == null) return "—";
		return new Date(ts).toLocaleString();
	}
</script>

<h1>Sessions</h1>
<p class="block-desc">Session counts by role; recent sessions (IP and fingerprint redacted). Invalidate = log out that session.</p>
<div class="session-counts">
	<span>Guest: <strong>{data.sessionCounts.guest}</strong></span>
	<span>Trusted: <strong>{data.sessionCounts.trusted}</strong></span>
	<span>Admin: <strong>{data.sessionCounts.admin}</strong></span>
</div>

<article class="block">
	<table>
		<thead>
			<tr>
				<th>Session (prefix)</th>
				<th>Kind</th>
				<th>Username</th>
				<th>Last presence</th>
				<th>IP (redacted)</th>
				<th>Fingerprint</th>
				<th>Action</th>
			</tr>
		</thead>
		<tbody>
			{#each data.sessions as s}
				<tr>
					<td><code>{s.id.slice(0, 8)}…</code></td>
					<td>{s.userKind}</td>
					<td>{s.username ?? "—"}</td>
					<td>{formatTime(s.lastPresenceAt)}</td>
					<td>{s.ipRedacted}</td>
					<td>{s.fingerprintPrefix}</td>
					<td>
						<form method="POST" action="?/invalidate" class="inline">
							<input type="hidden" name="sid" value={s.id} />
							<button type="submit" class="btn-sm btn-danger">Invalidate</button>
						</form>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
	{#if data.sessions.length === 0}
		<p class="muted">No sessions.</p>
	{/if}
</article>

<style>
	.session-counts {
		display: flex;
		gap: 1.5rem;
		margin-bottom: 1rem;
		font-size: 0.95rem;
		color: var(--muted);
	}
	.session-counts strong {
		color: var(--text);
	}
</style>
