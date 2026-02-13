---
title: Multiplayer
---

# Multiplayer

Multiplayer is event-based (no Yjs). The library provides a default SvelteKit backend (SSE stream + Remote functions) and an adapter interface so you can plug in your own server.

## Adapter

The `ExcalidrawMultiplayer` component takes an **adapter** that implements `ExcalidrawMultiplayerAdapter`: `join(roomId, userInfo)` returns a `RoomConnection` (userId + subscribe stream + leave), and `push(roomId, userId, payload)` sends elements, files, awareness, viewport, etc. The default adapter uses the SvelteKit stack.

## Stream (server → client)

Use `handleExcalidrawStream` from `svelte-excalidraw/server` in your POST handler. You own the route: do auth, parse body, then call:

```js
import { handleExcalidrawStream } from "svelte-excalidraw/server";

export async function POST({ request, params }) {
  const body = await request.json().catch(() => ({}));
  const roomId = params.roomId;
  const username = body.username?.trim();
  if (!roomId || !username)
    return new Response("Missing roomId or username", { status: 400 });
  return handleExcalidrawStream(request, {
    roomId,
    username,
    color: body.color,
  });
}
```

The first SSE event is `init` with the full document and collaborators. No separate GET for the document.

## Remotes (client → server)

The library provides Remote functions (e.g. `pushElements`, `pushAwareness`) in `svelte-excalidraw/remote`. Register them in your app so the default adapter can call them. Your SvelteKit app must enable Remote functions and expose these; the default adapter expects them to be available (e.g. via the same app that serves the stream).

## Persistence (split layout)

Optional file-based persistence: one directory per room with `scene.json` (elements) and a `files/` subdir for binary assets. Use `setLoadCallback` / `setPersistCallback` on the server (from `excalidraw-room-state`) and register the file-storage extension (e.g. `registerFileStorage()` from svelte-excalidraw server modules) in `hooks.server.ts` so rooms survive restarts.

## Client usage (batteries-included)

```svelte
<script>
  import { ExcalidrawMultiplayer, createDefaultAdapter } from "svelte-excalidraw";
</script>

<ExcalidrawMultiplayer
  roomId="my-room"
  userInfo={{ username: "Alice", color: { background: "#9775fa", stroke: "#9775fa" } }}
  adapter={createDefaultAdapter({
    streamUrl: (roomId) => `/multiplayer/${roomId}`,
  })}
/>
```
