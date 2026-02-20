---
title: Multiplayer
---

<script>
  import FlowchartDiagram from "$lib/FlowchartDiagram.svelte";
</script>

# Multiplayer

Shared whiteboards with a default SvelteKit backend. Or plug your own via the adapter interface.

**[Guide](/multiplayer/guide)**: From `npx sv create` to a working multiplayer whiteboard with file-system persistence. Copy-paste walkthrough.

## Quick setup

1. Enable [Remote functions](https://svelte.dev/docs/kit/remote-functions) in `svelte.config.js`.
2. Add a POST route that returns `handleExcalidrawStream(request, { roomId, username, color })`. [Adapters](/multiplayer/adapters)
3. Use `createDefaultAdapter({ streamUrl: (roomId) => "/your-path/" + roomId })` on the client.

Persistence is on by default. [Customize](/multiplayer/persistence) or pass `persist: false` for demos.

## Flow

<FlowchartDiagram mermaid={`flowchart LR
  subgraph client [Client]
    UI[ExcalidrawMultiplayer]
    Adapter[Default adapter]
    UI --> Adapter
  end
  subgraph server [Server]
    Stream[POST stream route]
    Remotes[Remote functions]
  end
  Adapter -->|POST, then SSE| Stream
  Adapter -->|pushElements, pushAwareness, etc.| Remotes
  Stream -->|init + updates| Adapter
`} />
