<script lang="ts">
	import type { WorkspaceRow } from "$lib/server/admin/data.js";

	let { data }: { data: { workspaces: WorkspaceRow[] } } = $props();

	function formatTime(ts: number): string {
		return new Date(ts).toLocaleString();
	}
</script>

<h1>Workspaces</h1>
<p class="block-desc">Share policy, revoke share links, cleanup stale whiteboards (90+ days inactive), or run full lifecycle cleanup.</p>

<form method="POST" action="?/runCleanup" class="action-row">
	<button type="submit" class="btn btn-primary">Run lifecycle cleanup now</button>
</form>

<article class="block">
	<table>
		<thead>
			<tr>
				<th>Workspace</th>
				<th>Whiteboards</th>
				<th>Share links</th>
				<th>Last updated</th>
				<th>Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each data.workspaces as w}
				<tr>
					<td><a href="/workspace/{w.id}">{w.name ?? w.id}</a></td>
					<td>{w.whiteboardCount}</td>
					<td>{w.shareLinksDisabled ? "Disabled" : "Allowed"}</td>
					<td>{formatTime(w.updatedAt)}</td>
					<td>
						{#if w.shareLinksDisabled}
							<form method="POST" action="?/setShareLinksPolicy" class="inline">
								<input type="hidden" name="workspaceId" value={w.id} />
								<input type="hidden" name="disabled" value="false" />
								<button type="submit" class="btn-sm">Enable share links</button>
							</form>
						{:else}
							<form method="POST" action="?/setShareLinksPolicy" class="inline">
								<input type="hidden" name="workspaceId" value={w.id} />
								<input type="hidden" name="disabled" value="true" />
								<button type="submit" class="btn-sm">Disable share links (revoke)</button>
							</form>
						{/if}
						<form method="POST" action="?/revokeShareLinks" class="inline">
							<input type="hidden" name="workspaceId" value={w.id} />
							<button type="submit" class="btn-sm">Revoke share links</button>
						</form>
						<form method="POST" action="?/cleanupStale" class="inline">
							<input type="hidden" name="workspaceId" value={w.id} />
							<button type="submit" class="btn-sm">Cleanup stale (90d)</button>
						</form>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
	{#if data.workspaces.length === 0}
		<p class="muted">No workspaces.</p>
	{/if}
</article>

<style>
	.action-row {
		margin-bottom: 1.5rem;
	}
</style>
