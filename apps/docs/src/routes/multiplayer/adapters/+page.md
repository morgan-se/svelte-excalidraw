---
title: Adapters
---

# Adapters

The `ExcalidrawMultiplayer` component takes an **adapter** that implements `ExcalidrawMultiplayerAdapter`:

- `join(roomId, userInfo)`: returns a `RoomConnection` (userId + subscribe stream + leave)
- `push(roomId, userId, payload)`: sends elements, files, awareness, viewport, etc.

The default adapter uses the SvelteKit stack: **SSE for the stream** (server → client) and **Remote functions for push** (client → server).

## Stream (server → client)

The client POSTs to your route; the response is an **SSE (Server-Sent Events)** stream. Use `handleExcalidrawStream` from `svelte-excalidraw/server` in your POST handler:

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

The library provides Remote functions (e.g. `pushElements`, `pushAwareness`) in `svelte-excalidraw/remote`. The default adapter imports them; the page that uses `ExcalidrawMultiplayer` pulls that module into the server bundle, so SvelteKit generates the RPC endpoints with no extra setup.

The adapter expects these remotes to be available (same app that serves the stream). See the [Multiplayer API](/api/multiplayer#remotes) for signatures.

## Custom adapters

For custom transports (e.g. iframes via postMessage, WebSocket, or a different backend), implement the interface and pass it to `ExcalidrawMultiplayer`. The [Iframe example](/examples/iframe) shows a no-server adapter using postMessage.
