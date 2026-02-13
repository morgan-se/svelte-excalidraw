---
title: Getting started
---

<script>
  import CodeAndPreview from '$lib/CodeAndPreview.svelte';
  import * as Minimal from '$lib/examples/minimal.js';
  import * as InitialData from '$lib/examples/initial-data.js';
</script>

# Getting started

## Install

```bash
npm install svelte-excalidraw
```

Peer dependencies: `svelte` ^5, `@excalidraw/excalidraw`, `react`, `react-dom` (used internally by Excalidraw).

> **⚠️ Install size:** The underlying `@excalidraw/excalidraw` dependency and its peers (e.g. mermaid) are large. Install size is **~185MB** across 272 packages ([pkg-size.dev](https://pkg-size.dev/@excalidraw%2Fexcalidraw@0.18.0-3a5ef40)).

## Minimal example

A single-player canvas with no server: import and render.

<CodeAndPreview example={Minimal} />

## A bit more: initial data, grid, theme

Pass `initialData` to preload elements and app state, and use props like `theme`, `gridModeEnabled`, and `viewModeEnabled` to tune the canvas.

<CodeAndPreview example={InitialData} />

You can add more elements, set `theme="dark"`, enable `zenModeEnabled`, and use `onChange` to persist or react to edits. See the [API reference](/api) for all props.

## Multiplayer

For most apps you want **real-time collaboration**: shared cursors, live elements and persistence. Two ways to do it:

**Batteries included (SvelteKit)** — Use the built-in backend: a POST endpoint that calls `handleExcalidrawStream` from `svelte-excalidraw/server`, remotes for push (elements, awareness), and `ExcalidrawMultiplayer` with `createDefaultAdapter`. No extra transport; you wire the stream URL and register the remotes.

```svelte
<script>
  import { ExcalidrawMultiplayer, createDefaultAdapter } from "svelte-excalidraw";
</script>

<ExcalidrawMultiplayer
  roomId="my-room"
  userInfo={{ username: "Alice", color: { background: "#9775fa", stroke: "#9775fa" } }}
  adapter={createDefaultAdapter({ streamUrl: (roomId) => `/multiplayer/${roomId}` })}
/>
```

**Your own backend** — Use the same `ExcalidrawMultiplayer` component with a custom adapter (WebSockets, Durable Objects, Firebase, etc.). Implement the adapter interface; the [Multiplayer](/multiplayer) page has the contract and details.

For full setup (stream, remotes, persistence, adapter options), see **[Multiplayer](/multiplayer)**.
