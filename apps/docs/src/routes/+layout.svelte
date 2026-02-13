<script lang="ts">
	import '$lib/../app.css';
	import { page } from '$app/state';

	const repoUrl = 'https://github.com/tips-services/svelte-excalidraw';
</script>

<div class="docs">
	<header class="header">
		<a href="/" class="logo">svelte-excalidraw</a>
		<nav class="nav">
			<a href="/getting-started" class:active={page.url.pathname === '/getting-started'}>Getting started</a>
			<a href="/multiplayer" class:active={page.url.pathname.startsWith('/multiplayer')}>Multiplayer</a>
			<a href="/auth" class:active={page.url.pathname === '/auth'}>Auth</a>
			<a href="/api" class:active={page.url.pathname === '/api'}>API</a>
			<a href="/examples" class:active={page.url.pathname === '/examples'}>Examples</a>
			<a href={repoUrl} class="github" target="_blank" rel="noopener noreferrer" aria-label="GitHub repository">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
				</svg>
			</a>
		</nav>
	</header>
	<main class="main">
		<slot />
	</main>
	<footer class="footer">
		<p>
			<a href={repoUrl} target="_blank" rel="noopener noreferrer">GitHub</a>
			·
			<a href="https://www.npmjs.com/package/svelte-excalidraw" target="_blank" rel="noopener noreferrer">npm</a>
			·
			<a href="/api">API</a>
		</p>
		<p class="footer-muted">
			svelte-excalidraw — Svelte wrapper for Excalidraw with multiplayer.
		</p>
		<p class="footer-credit">
			Brought to you by <a href="https://tips.dev" target="_blank" rel="noopener noreferrer">tips.dev</a>
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
		color: var(--accent, #a78bfa);
		font-weight: 500;
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
	.main {
		flex: 1;
		max-width: 52rem;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		width: 100%;
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
		color: var(--accent, #a78bfa);
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
		color: var(--accent, #a78bfa);
	}
	.footer-credit a:hover {
		text-decoration: underline;
	}
</style>
