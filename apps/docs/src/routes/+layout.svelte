<script lang="ts">
	import "$lib/../app.css";
	import { page } from "$app/state";
	import { onMount } from "svelte";
	import type { Snippet } from "svelte";
	import { getSectionForPath, isSectionItemActive, sectionNav } from "$lib/docs-nav.js";

	const { children }: { children: Snippet } = $props();
	const repoUrl = "https://github.com/tips-services/svelte-excalidraw";

	const isIframeEmbed = $derived(page.url.pathname.includes("/examples/iframe/embed"));
	const sectionKey = $derived(getSectionForPath(page.url.pathname));
	const section = $derived(sectionKey ? sectionNav[sectionKey] ?? null : null);

	let sidebarOpen = $state(false);
	let mobile = $state(false);

	onMount(() => {
		const mq = window.matchMedia("(max-width: 767px)");
		const set = () => (mobile = mq.matches);
		set();
		mq.addEventListener("change", set);
		return () => mq.removeEventListener("change", set);
	});

	const showSidebar = $derived(section || mobile);

	function closeSidebar() {
		sidebarOpen = false;
	}
</script>

{#if isIframeEmbed}
	{@render children()}
{:else}
<div class="docs">
	<header class="header">
		{#if showSidebar}
			<button
				type="button"
				class="sidebar-toggle"
				aria-label="Toggle menu"
				aria-expanded={sidebarOpen}
				onclick={() => (sidebarOpen = !sidebarOpen)}
			>
				<svg class="sidebar-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<path d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			</button>
		{/if}
		<a class:active={page.url.pathname === "/"} href="/" class="logo"
			>svelte-excalidraw</a
		>
		<nav class="nav nav-desktop">
			<a
				href="/getting-started"
				class:active={page.url.pathname === "/getting-started"}
				>Getting started</a
			>
			<a
				href="/multiplayer"
				class:active={page.url.pathname.startsWith("/multiplayer")}
				>Multiplayer</a
			>
			<a href="/api" class:active={page.url.pathname.startsWith("/api")}>API</a>
			<a href="/examples" class:active={page.url.pathname.startsWith("/examples")}
				>Examples</a
			>
			<a href="/svex" class:active={page.url.pathname.startsWith("/svex")}
				>SVEX</a
			>
			<a
				href={repoUrl}
				class="github"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="GitHub repository"
			>
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="currentColor"
					aria-hidden="true"
				>
					<path
						d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
					/>
				</svg>
			</a>
		</nav>
	</header>
	<div class="body-with-sidebar">
		{#if showSidebar}
			<aside class="sidebar" class:sidebar-open={sidebarOpen}>
				<div class="sidebar-inner">
					<nav class="sidebar-main-nav" aria-label="Main navigation">
						<a href="/" class="sidebar-link" class:active={page.url.pathname === "/"} onclick={closeSidebar}>Home</a>
						<a href="/getting-started" class="sidebar-link" class:active={page.url.pathname === "/getting-started"} onclick={closeSidebar}>Getting started</a>
						<a href="/multiplayer" class="sidebar-link" class:active={page.url.pathname.startsWith("/multiplayer")} onclick={closeSidebar}>Multiplayer</a>
						<a href="/api" class="sidebar-link" class:active={page.url.pathname.startsWith("/api")} onclick={closeSidebar}>API</a>
						<a href="/examples" class="sidebar-link" class:active={page.url.pathname.startsWith("/examples")} onclick={closeSidebar}>Examples</a>
						<a href="/svex" class="sidebar-link" class:active={page.url.pathname.startsWith("/svex")} onclick={closeSidebar}>SVEX</a>
						<a href={repoUrl} class="sidebar-link github" target="_blank" rel="noopener noreferrer" onclick={closeSidebar}>GitHub</a>
					</nav>
					{#if section}
						<h2 class="sidebar-title">{section.label}</h2>
						<nav class="sidebar-nav" aria-label="{section.label} sub-navigation">
							{#each section.items as item}
								<a
									href={item.path}
									class="sidebar-link"
									class:active={isSectionItemActive(page.url.pathname, item.path)}
									onclick={closeSidebar}
								>
									{item.label}
								</a>
							{/each}
						</nav>
					{/if}
				</div>
			</aside>
			{#if sidebarOpen}
				<button
					type="button"
					class="sidebar-backdrop"
					aria-label="Close menu"
					onclick={closeSidebar}
				></button>
			{/if}
		{/if}
		<main class="main">
			<div class="main-inner">
				{@render children()}
			</div>
		</main>
	</div>
	<footer class="footer">
		<p>
			<a href={repoUrl} target="_blank" rel="noopener noreferrer"
				>GitHub</a
			>
			·
			<a
				href="https://www.npmjs.com/package/svelte-excalidraw"
				target="_blank"
				rel="noopener noreferrer">npm</a
			>
			·
			<a href="/api">API</a>
		</p>
		<p class="footer-muted">
			Svelte wrapper for Excalidraw with multiplayer.
		</p>
		<p class="footer-credit">
			By <a
				href="https://tips.dev"
				target="_blank"
				rel="noopener noreferrer">tips.dev</a
			>. Not affiliated with <a
			href="https://plus.excalidraw.com"
			target="_blank"
			rel="noopener noreferrer">Excalidraw</a
		>.
		</p>
	</footer>
</div>

<style>
	.docs {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--bg, #0f0f12);
		color: var(--text, #e4e4e7);
	}
	.header {
		position: sticky;
		top: 0;
		z-index: 101;
		display: flex;
		align-items: center;
		gap: 2rem;
		padding: 0.75rem 1.5rem;
		border-bottom: 1px solid var(--border, #27272a);
		background: var(--bg, #0f0f12);
	}
	.logo {
		font-weight: 700;
		font-size: 1.125rem;
		color: inherit;
		text-decoration: none;
	}
	.nav {
		display: flex;
		align-items: center;
		flex: 1;
		gap: 1rem;
	}
	.nav a {
		color: var(--muted, #a1a1aa);
		text-decoration: none;
		font-size: 0.875rem;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}
	.nav a:hover {
		color: var(--text, #e4e4e7);
	}
	.nav a.active {
		color: var(--accent, #fc6241);
	}
	.header a.active {
		color: var(--accent, #fc6241);
	}
	.nav a.github {
		display: flex;
		align-items: center;
		margin-left: auto;
		padding: 0.25rem;
		color: var(--muted, #a1a1aa);
	}
	.nav a.github:hover {
		color: var(--text, #e4e4e7);
	}
	.sidebar-toggle {
		display: none;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		margin: 0 0.5rem 0 0;
		padding: 0;
		background: transparent;
		border: 1px solid var(--border, #27272a);
		border-radius: 6px;
		color: var(--text, #e4e4e7);
		cursor: pointer;
	}
	.sidebar-toggle:hover {
		background: var(--border, #27272a);
	}
	.sidebar-toggle-icon {
		width: 1.25rem;
		height: 1.25rem;
	}
	.body-with-sidebar {
		display: flex;
		flex: 1;
		min-height: 0;
		position: relative;
	}
	.sidebar {
		position: fixed;
		top: 0;
		left: 0;
		z-index: 100;
		width: var(--sidebar-width, 14rem);
		height: 100vh;
		padding: 4rem 0 1.5rem 1.5rem;
		background: var(--bg, #0f0f12);
		border-right: 1px solid var(--border, #27272a);
		overflow-y: auto;
		transform: translateX(-100%);
		transition: transform 0.2s ease, box-shadow 0.2s ease;
		pointer-events: none;
	}
	.sidebar.sidebar-open {
		pointer-events: auto;
	}
	.sidebar-inner {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.sidebar-main-nav {
		display: none;
		flex-direction: column;
		gap: 0.125rem;
		padding-bottom: 0.75rem;
		margin-bottom: 0.75rem;
		border-bottom: 1px solid var(--border, #27272a);
	}
	.sidebar-title {
		margin: 0 0 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted, #a1a1aa);
	}
	.sidebar-nav {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}
	.sidebar-link {
		display: block;
		padding: 0.4rem 0.5rem;
		font-size: 0.875rem;
		color: var(--muted, #a1a1aa);
		text-decoration: none;
		border-radius: 4px;
	}
	.sidebar-link:hover {
		color: var(--text, #e4e4e7);
		background: var(--border, #27272a);
	}
	.sidebar-link.active {
		color: var(--accent, #fc6241);
		font-weight: 500;
	}
	.sidebar-backdrop {
		position: fixed;
		inset: 0;
		z-index: 99;
		background: rgba(0, 0, 0, 0.5);
		border: none;
		cursor: pointer;
	}
	.main {
		flex: 1;
		min-width: 0;
		min-height: 0;
		padding: 2rem 1.5rem;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.main-inner {
		width: 100%;
		max-width: var(--doc-max-width);
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
	.main-inner > :global(*) {
		flex: 1;
		min-height: 0;
	}
	/* Desktop: sidebar in flow, doc centered in remaining space. Shrinks together until phone. */
	@media (min-width: 768px) {
		.sidebar-toggle {
			display: none;
		}
		.sidebar-backdrop {
			display: none;
		}
		.sidebar {
			position: sticky;
			top: 3.5rem;
			left: auto;
			align-self: flex-start;
			height: auto;
			max-height: calc(100vh - 3.5rem);
			padding: 2rem 1rem 2rem 1rem;
			transform: none;
			pointer-events: auto;
			flex-shrink: 0;
			border-right: none;
		}
		.sidebar::after {
			content: '';
			position: fixed;
			left: var(--sidebar-width, 10rem);
			top: 3.5rem;
			bottom: 0;
			width: 1px;
			background: var(--border, #27272a);
			pointer-events: none;
		}
		.body-with-sidebar {
			align-items: stretch;
		}
	}
	@media (max-width: 767px) {
		.nav-desktop {
			display: none;
		}
		.sidebar-toggle {
			display: flex;
		}
		.sidebar-main-nav {
			display: flex;
		}
		.sidebar {
			padding-top: 4.5rem;
		}
		.sidebar.sidebar-open {
			transform: translateX(0);
			box-shadow: 0.25rem 0 1rem rgba(0, 0, 0, 0.3);
		}
	}
	.footer {
		padding: 2rem 1.5rem;
		border-top: 1px solid var(--border, #27272a);
		text-align: center;
		font-size: 0.875rem;
	}
	.footer p {
		margin: 0 0 0.5rem;
	}
	.footer p:last-child {
		margin-bottom: 0;
	}
	.footer a {
		color: var(--accent, #fc6241);
		text-decoration: none;
	}
	.footer a:hover {
		text-decoration: underline;
	}
	.footer-muted {
		color: var(--muted, #a1a1aa);
		font-size: 0.8125rem;
	}
	.footer-credit {
		margin-top: 0.25rem;
		font-size: 0.8125rem;
		color: var(--muted, #a1a1aa);
	}
	.footer-credit a {
		color: var(--accent, #fc6241);
	}
	.footer-credit a:hover {
		text-decoration: underline;
	}
</style>
{/if}
