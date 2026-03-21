<script lang="ts">
	import { page } from "$app/stores";
</script>

<div class="svex-page">
	<nav class="svex-nav">
		<a href="/">← App</a>
		<a href="/account">Account</a>
		<a href="/admin" class:active={$page.url.pathname === "/admin"}>Overview</a>
		<a href="/admin/security" class:active={$page.url.pathname === "/admin/security"}>Security</a>
		<a href="/admin/sessions" class:active={$page.url.pathname === "/admin/sessions"}>Sessions</a>
		<a href="/admin/workspaces" class:active={$page.url.pathname === "/admin/workspaces"}>Workspaces</a>
		<a href="/admin/bootstrap" class:active={$page.url.pathname === "/admin/bootstrap"}>Bootstrap</a>
	</nav>

	<main>
		<slot />
	</main>
</div>

<style>
	.svex-nav {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border);
	}
	.svex-nav a {
		color: var(--accent);
		text-decoration: none;
		font-weight: 500;
	}
	.svex-nav a:hover {
		text-decoration: underline;
	}
	.svex-nav a.active {
		font-weight: 600;
		text-decoration: underline;
	}
</style>
