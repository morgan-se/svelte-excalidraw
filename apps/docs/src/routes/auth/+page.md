---
title: Auth
---

# Auth

Authentication and authorization are **your responsibility**. The library does not implement login or session handling.

## Where to enforce auth

- **Stream (POST)** — Your POST handler that calls `handleExcalidrawStream` should run after you verify the user (e.g. session cookie, JWT). Reject with 401/403 if unauthenticated or not allowed to join the room.
- **Remotes** — Remote functions (pushElements, pushAwareness, etc.) run on the server; add auth checks there so only authenticated users can push to a room.
- **Room list / delete** — If you expose `listRooms` or `deleteRoom`, protect them by role or ownership.

## Example: BetterAuth

For a full example that wires session-based auth (e.g. <a href="https://www.better-auth.com/" target="_blank" rel="noopener">BetterAuth</a>) with multiplayer, see the [Examples](/examples) section. The BetterAuth example shows a protected multiplayer route: POST uses the session to get the current user, then calls `handleExcalidrawStream`; remotes are registered and can use the same session for commands.
