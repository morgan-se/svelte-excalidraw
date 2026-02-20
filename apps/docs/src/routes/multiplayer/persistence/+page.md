---
title: Persistence
---

# Persistence

- **File storage (default):** Room state is persisted to `data/excalidraw-rooms/{roomId}/` (scene.json + files/). Rooms survive server restarts. `handleExcalidrawStream` auto-registers this when no custom callbacks are set.

- **In-memory only:** Pass `persist: false` to `handleExcalidrawStream` for demos or local-only flows. When the last peer leaves, the room is torn down.

- **Custom:** Wire `setLoadCallback` / `setPersistCallback` (from `svelte-excalidraw/server/state`) in your hooks before the first request to use your own storage.

## Custom storage example

In `src/hooks.server.ts`, call the setters once at startup:

```js
import { setLoadCallback, setPersistCallback } from "svelte-excalidraw/server/state";

setLoadCallback((roomId) => {
  const stored = myDb.getRoom(roomId);
  return stored ? { elements: stored.elements, files: stored.files } : null;
});

setPersistCallback((roomId, doc) => {
  myDb.saveRoom(roomId, { elements: doc.elements, files: doc.files });
});
```

`RoomDocument` is `{ elements: ElementLike[]; files: Record<string, unknown> }`. Persist is debounced by the server; your callback receives updates after changes. For file storage (images, etc.), use `registerFileStorage` from the same package or implement your own via the callbacks.
