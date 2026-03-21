<script lang="ts">
	import { page } from "$app/stores";

	let { data, children } = $props();
</script>

<div class="svex-page">
	<nav class="svex-nav">
		<a href="/">← App</a>
		{#if data.account?.role === "admin"}
			<a href="/admin">Admin</a>
		{/if}
		{#if data.account}
			<a href="/account" class:active={$page.url.pathname === "/account"}>Overview</a>
			<a href="/account/security" class:active={$page.url.pathname === "/account/security"}>Security</a>
			<span class="nav-right">
				<span class="nav-username">{data.account.username}</span>
				<a href="/account/logout">Logout</a>
			</span>
		{:else}
			<a href="/account/create" class:active={$page.url.pathname === "/account/create"}>Create account</a>
			<a href="/account/login" class:active={$page.url.pathname === "/account/login"}>Login</a>
		{/if}
	</nav>

	<main>
		{@render children()}
	</main>
</div>

<style>
	.svex-nav {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border);
	}
	.nav-right {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.nav-username {
		font-size: 0.9rem;
		color: var(--muted);
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
