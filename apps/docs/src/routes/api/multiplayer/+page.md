---
title: Multiplayer API
---

# Multiplayer API

Everything for real-time collaborative whiteboards: component, adapter, types, server, persistence.

---

## Component

### ExcalidrawMultiplayer

Props: `roomId: string`, `userInfo: RoomUserInfo`, `adapter: ExcalidrawMultiplayerAdapter`, optional `theme`, `UIOptions`. For user identity UI (name + color picker), use [CollaboratorProfile](/api/components#collaboratorprofile).

```svelte
<script>
  import { ExcalidrawMultiplayer } from "svelte-excalidraw";
  import { createDefaultAdapter } from "svelte-excalidraw/adapter";

  const adapter = createDefaultAdapter({
    streamUrl: (roomId) => `/room/${roomId}`,
  });
</script>

<ExcalidrawMultiplayer
  roomId="my-room"
  userInfo={{ username: "Alice", color: { background: "#6965db", stroke: "#6965db" } }}
  {adapter}
/>
```

### createDefaultAdapter

Returns `ExcalidrawMultiplayerAdapter`. Options: `streamUrl: (roomId: string) => string` (full URL for the room stream).

```js
import { createDefaultAdapter } from "svelte-excalidraw/adapter";

const adapter = createDefaultAdapter({
  streamUrl: (roomId) => `/room/${roomId}`,
});
```

---

## Types

### ExcalidrawMultiplayerAdapter

Implement `join` and `push` for custom backends.

```ts
interface ExcalidrawMultiplayerAdapter {
  join(roomId: string, userInfo: RoomUserInfo): Promise<RoomConnection>;
  push(roomId: string, userId: string, payload: RoomPush): Promise<void>;
}
```

### RoomUserInfo

```ts
interface RoomUserInfo {
  username: string;
  color?: { background: string; stroke: string };
  avatarUrl?: string;
}
```

### RoomConnection

Returned by `adapter.join()`.

```ts
interface RoomConnection {
  userId: string;
  subscribe(): AsyncIterable<RoomEvent>;
  leave(): void;
}
```

### RoomPush

Payload for `adapter.push()`. Use `switch (payload.type)`.

| `type` | Payload |
| --- | --- |
| `"elements"` | `{ elements }` |
| `"files"` | `{ files }` |
| `"viewport"` | `{ sceneBounds }` |
| `"followState"` | `{ followingUserId: string &#124; null }` |
| `"userInfo"` | `{ userInfo: RoomUserInfo }` |
| `"awareness"` | `{ awareness: AwarenessUpdate }` |

### RoomEvent

Events from `subscribe()`. First is always `init` with document.

| `type` | Payload |
| --- | --- |
| `"init"` | `{ document, userId?, collaborators? }` |
| `"elements"`, `"files"`, `"viewport"`, `"awareness"` | type-specific |
| `"collaborator_joined"`, `"collaborator_updated"`, `"collaborator_left"` | (none) |
| `"host_left"`, `"followed_by"`, `"sync"` | (none) |

### ExcalidrawStreamJoinOptions

Options for `handleExcalidrawStream`.

```ts
interface ExcalidrawStreamJoinOptions {
  roomId: string;
  username: string;
  color?: { background: string; stroke: string };
  initialDocument?: RoomDocument;
  onJoin?: (roomId: string, userId: string) => void;
  persist?: boolean;  // default true
}
```

---

## Server

### handleExcalidrawStream

Returns `Promise<Response>` (SSE). Use in your POST handler after auth/parsing.

```ts
// src/routes/room/[roomId]/+server.ts
import { handleExcalidrawStream } from "svelte-excalidraw/server";

export const prerender = false;

export async function POST({ request, params }) {
  const body = (await request.json().catch(() => ({}))) as { username?: string; color?: { background: string; stroke: string } };
  const roomId = params.roomId;
  const username = body.username?.trim();
  if (!roomId || !username)
    return new Response("Missing roomId or username", { status: 400 });
  return handleExcalidrawStream(request, { roomId, username, color: body.color });
}
```

### Remotes

Register in SvelteKit so the default adapter can push: `pushElements`, `pushFiles`, `pushViewport`, `pushFollowState`, `updateUserInfo`, `pushAwareness`. From `svelte-excalidraw/remote`.

---

## Persistence

- **setLoadCallback** / **setPersistCallback**: Custom load/save. From `svelte-excalidraw/server/state`.
- **registerFileStorage**: File-based persistence. From `svelte-excalidraw/server/file-storage`.
- **exportRoomToSinglePayload(roomId)** / **importRoomFromSinglePayload(roomId, payload)**: Backup/restore.

```ts
// src/hooks.server.ts
import { setLoadCallback, setPersistCallback } from "svelte-excalidraw/server/state";

setLoadCallback((roomId) => myDb.getRoom(roomId) ?? null);
setPersistCallback((roomId, doc) => myDb.saveRoom(roomId, doc));
```
