---
title: Examples
---

# Examples

Example apps that use svelte-excalidraw with different backends and patterns.

## BetterAuth

`examples/betterauth` — SvelteKit app with <a href="https://www.better-auth.com/" target="_blank" rel="noopener">BetterAuth</a>: session-based auth, protected multiplayer route. POST uses auth then calls `handleExcalidrawStream`; remotes are registered; optional auth on commands. See the example README for how auth is wired.

## Zero backend

`examples/zero-sync` — Alternative backend (ZeroSync or “zero” architecture) with the same `ExcalidrawMultiplayer` component and a custom adapter.

## Iframe embed

`examples/iframe-embed` — Minimal host + embed setup if you need the canvas in an iframe. Includes instructions in the README and in the docs.

<p class="note">These examples live in the repo under <code>examples/</code>. Run them from the monorepo root or from each example directory as described in their README.</p>
