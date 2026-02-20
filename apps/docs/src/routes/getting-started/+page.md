---
title: Getting started
---

# Getting started

This guide gets you from zero to a working Excalidraw whiteboard in your Svelte app. By the end, you'll have either a **single-player** canvas (no server) or a **multiplayer** canvas with real-time collaboration.

```bash
npm install svelte-excalidraw
```

> **node_modules size:** The underlying `@excalidraw/excalidraw` dependency is large (**~185MB** across 272 packages). See [pkg-size.dev](https://pkg-size.dev/@excalidraw%2Fexcalidraw@0.18.0-3a5ef40) for details.

---

## Path A: Single-player (no server)

Import `Excalidraw`, render it in a page. No server or config. See the [Examples](/examples) for minimal setup and more patterns.

---

## Path B: Multiplayer (real-time collaboration)

For shared cursors and live element sync, follow the **[Multiplayer guide](/multiplayer/guide)**: step-by-step from `npx sv create` to a working whiteboard with lobby, stream route, and file-system persistence.

---

## Next steps

| Goal | Where to go |
|------|-------------|
| See more single-player patterns | [Examples](/examples): events, children, custom UI |
| Understand the multiplayer flow | [Multiplayer guide](/multiplayer/guide): full walkthrough with lobby |
| Use a custom backend | [Adapters](/multiplayer/adapters): WebSocket, postMessage, etc. |
| API reference | [Components](/api/components), [Multiplayer](/api/multiplayer) |
