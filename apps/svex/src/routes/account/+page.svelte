<script lang="ts">
	let { data } = $props();
</script>

<h1>Account</h1>

<p class="block-desc">Signed in as <strong>{data.account.username}</strong> ({data.account.role}).</p>

<article class="block">
	<h2>Security & sessions</h2>
	<p class="muted">Change your password, view active sessions, and revoke access from other devices.</p>
	<a href="/account/security" class="btn btn-primary">Open Security</a>
</article>
