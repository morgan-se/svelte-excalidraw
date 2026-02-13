---
title: API reference
---

# API reference

Exports from the main package and subpaths.

## Main package (`svelte-excalidraw`)

### Components

- **Excalidraw** — Default export. Single-player canvas. Props follow `@excalidraw/excalidraw` (e.g. `initialData`, `excalidrawAPI`, `theme`, `viewModeEnabled`, `onChange`, etc.).
- **ExcalidrawMultiplayer** — Multiplayer canvas. Props: `roomId: string`, `userInfo: RoomUserInfo`, `adapter: ExcalidrawMultiplayerAdapter`, optional `theme`, `UIOptions`.

### Multiplayer

- **createDefaultAdapter(options: DefaultAdapterOptions)** — Returns `ExcalidrawMultiplayerAdapter`. Options: `streamUrl: (roomId: string) => string` (full URL for the room stream, e.g. POST path).
- **ExcalidrawStreamJoinOptions** — Used by server: `roomId`, `username`, optional `color` (object with `background`, `stroke`).
- **Types** (RoomUserInfo, RoomEvent, RoomPush, RoomConnection, ExcalidrawMultiplayerAdapter, etc.) — Exported from the main package via `multiplayer` subpath or re-exported for convenience.

## Server (`svelte-excalidraw/server`)

- **handleExcalidrawStream(request, options: ExcalidrawStreamJoinOptions)** — Returns a `Promise<Response>` (SSE). Use in your POST handler after auth/parsing. First event is `init` with document and collaborators.

Room state and file storage (e.g. `setLoadCallback`, `setPersistCallback`, `registerFileStorage`, `exportRoomToSinglePayload`, `importRoomFromSinglePayload`) are used by the default backend; see the library source or design doc for details if you customize persistence.

## Remotes (`svelte-excalidraw/remote`)

Remote functions for the default backend: `listRooms`, `deleteRoom`, `pushElements`, `pushFiles`, `pushViewport`, `pushFollowState`, `updateUserInfo`, `pushAwareness`. Register them in your SvelteKit app so the default adapter can call them. Signatures match the payloads expected by the server (roomId, userId, and type-specific data).

## Persistence helpers

- **exportRoomToSinglePayload(roomId)** — Returns full room document (elements + files) or null. Useful for backup or migration.
- **importRoomFromSinglePayload(roomId, payload)** — Loads a room from a single payload (e.g. after restore).
