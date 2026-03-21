<script lang="ts">
	let { data, form } = $props();

	function formatTime(ts: number | null): string {
		if (ts == null) return "—";
		return new Date(ts).toLocaleString();
	}
</script>

<h1>Account security</h1>

{#if data.requireSetup}
	<p class="block-desc">You are an admin. Set a username and password to complete your account (required for admin).</p>
	<article class="block">
		<form method="POST" action="?/setupAdmin">
			{#if form?.error}
				<p class="error">{form.error}</p>
			{/if}
			<div class="form-group">
				<label for="username">Username</label>
				<input id="username" name="username" type="text" autocomplete="username" required minlength="2" maxlength="64" />
			</div>
			<div class="form-group">
				<label for="password">Password</label>
				<input id="password" name="password" type="password" autocomplete="new-password" required minlength="8" />
			</div>
			<button type="submit" class="btn btn-primary">Complete setup</button>
		</form>
	</article>
{:else}
	<p class="block-desc">Signed in as <strong>{data.account?.username}</strong> ({data.account?.role}).</p>

	<article class="block">
		<h2>Change password</h2>
		<form method="POST" action="?/changePassword">
			{#if form?.error && form?.message !== "Password updated."}
				<p class="error">{form.error}</p>
			{/if}
			{#if form?.message === "Password updated."}
				<p class="success">{form.message}</p>
			{/if}
			<div class="form-group">
				<label for="currentPassword">Current password</label>
				<input id="currentPassword" name="currentPassword" type="password" autocomplete="current-password" required />
			</div>
			<div class="form-group">
				<label for="newPassword">New password</label>
				<input id="newPassword" name="newPassword" type="password" autocomplete="new-password" required minlength="8" />
			</div>
			<button type="submit" class="btn btn-primary">Update password</button>
		</form>
	</article>

	<article class="block">
		<h2>Active sessions</h2>
		<p class="muted">Sessions signed in to this account. Revoke to sign out that device.</p>
		<table>
			<thead>
				<tr>
					<th>Session</th>
					<th>Last activity</th>
					<th>Action</th>
				</tr>
			</thead>
			<tbody>
				{#each data.sessions as s}
					<tr>
						<td>
							<code>{s.sessionId.slice(0, 8)}…</code>
							{#if s.current}
								<span class="badge">current</span>
							{/if}
						</td>
						<td>{formatTime(s.lastPresenceAt)}</td>
						<td>
							{#if !s.current}
								<form method="POST" action="?/revokeSession" class="inline">
									<input type="hidden" name="sessionId" value={s.sessionId} />
									<button type="submit" class="btn-sm">Revoke</button>
								</form>
							{:else}
								—
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</article>
{/if}
