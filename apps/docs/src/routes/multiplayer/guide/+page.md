---
title: Guide
---

# Multiplayer guide: from scratch to working whiteboard

Step-by-step: create a SvelteKit app, add Excalidraw multiplayer with file-system persistence, and run it.

## 1. Create the project

```bash
npx sv create my-whiteboard
cd my-whiteboard
```

Pick **minimal** or **demo**, and **TypeScript** if you like.

## 2. Install svelte-excalidraw

```bash
npm install svelte-excalidraw
```

## 3. Enable Remote functions

Edit **`svelte.config.js`** and add:

```js
kit: {
  adapter: adapter(),
  experimental: {
    remoteFunctions: true
  }
},
compilerOptions: {
  experimental: {
    async: true
  }
}
```

## 4. Add the stream route

Create **`src/routes/room/[roomId]/+server.ts`**:

```ts
import { handleExcalidrawStream } from "svelte-excalidraw/server";

export const prerender = false;

export async function POST({ request, params }) {
  const body = (await request.json().catch(() => ({}))) as {
    username?: string;
    color?: { background: string; stroke: string };
  };
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

Persistence is on by default: rooms are saved to `data/excalidraw-rooms/{roomId}/`.

## 5. Add the whiteboard page

Create **`src/routes/room/[roomId]/+page.svelte`**:

```svelte
<script>
  import { page } from "$app/state";
  import { ExcalidrawMultiplayer, createDefaultAdapter } from "svelte-excalidraw";

  const adapter = createDefaultAdapter({
    streamUrl: (roomId) => `/room/${roomId}`,
  });
</script>

<a href="/">← Back</a>
<ExcalidrawMultiplayer
  roomId={page.params.roomId}
  userInfo={{ username: "You", color: { background: "#6965db", stroke: "#6965db" } }}
  {adapter}
/>
```

## 6. Add the home page

Edit **`src/routes/+page.svelte`**:

```svelte
<script>
  import { goto } from "$app/navigation";

  let roomId = $state("");

  function createRoom() {
    goto(`/room/${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`);
  }

  function joinRoom() {
    const id = roomId.trim();
    if (id) goto(`/room/${encodeURIComponent(id)}`);
  }
</script>

<h1>Whiteboard</h1>
<button onclick={createRoom}>Create room</button>
<div>
  <input type="text" bind:value={roomId} placeholder="Room ID" onkeydown={(e) => e.key === "Enter" && joinRoom()} />
  <button onclick={joinRoom}>Join</button>
</div>
```

## 7. Run it

```bash
npm run dev
```

Open `http://localhost:5173`, create a room, open it in another tab or browser, and draw. Changes sync in real time and persist to `data/excalidraw-rooms/` across restarts.
