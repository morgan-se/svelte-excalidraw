---
title: SVEX Storage
---

# Storage

Server data lives under `SVEX_DATA_DIR` (default `./data`). SVEX uses a hybrid layout: **SQLite** for metadata and tokens, and **files** for whiteboard scene content.

## File directory layout

```
data/
├── db.sqlite              # SQLite DB (workspaces, collections, whiteboards, sessions, tokens)
├── workspaces/
│   └── <workspaceId>/
│       ├── <docId>/       # Root whiteboard
│       │   └── scene.json
│       └── <collection>/  # Collection subdirectory
│           └── <docId>/   # Collection whiteboard
│               └── scene.json
└── ephemerals/
    └── <id>/
        └── scene.json
```

### Workspace whiteboards

- **Root whiteboard**: `data/workspaces/<workspaceId>/<docId>/scene.json`
- **Collection whiteboard**: `data/workspaces/<workspaceId>/<collection>/<docId>/scene.json`

Room IDs map to paths as follows:

- `workspaceId/docId` → root whiteboard
- `workspaceId/collection/docId` → collection whiteboard

### Ephemeral rooms

- `data/ephemerals/<id>/scene.json`: Deleted automatically after TTL with no activity (see [Config](/svex/self-hosting/config#ephemeral) for `ephemeral.ttlHours`).

### Local (folder) whiteboards

Data flows through the server for real-time collaboration (SSE, etc.) but is **never stored** on the server. Persistence is only on the user's machine. On the **local filesystem**, the user picks a folder; each whiteboard is a file there: `<name>.excalidraw` (Excalidraw JSON). Example: `my-folder/scene.excalidraw`, `my-folder/board1.excalidraw`.

---

## SQLite schema

`data/db.sqlite` holds all metadata. No migrations; the schema is created on first run. WAL mode is enabled.

### Tables

| Table | Purpose |
|-------|---------|
| `workspaces` | id, is_remote, name, description, timestamps |
| `collections` | workspace_id, slug, name, description, timestamps |
| `whiteboards` | id, workspace_id, collection, doc_id, name, description, timestamps, host_user_id |
| `sessions` | id, user_kind, username, color, created_at, last_presence_at, login_token (static, for login links), ip, user_agent, fingerprint |
| `session_grants` | session_id, workspace_id OR whiteboard_id, access (read/readWrite). Cascade on delete. |
| `share_tokens` | token, kind, workspace_id, room_id, access, expires_at (one-time use, max 24h or room liveness) |
| `upgrade_tokens` | token, target_user_kind, expires_at (one-time use) |

---

## Storage limits

See [Config](/svex/self-hosting/config#storage) for `storage.*` keys.

---

## Lifecycle cleanup

Runs every `cleanupIntervalMinutes` (see `hooks.server.ts`):

1. **Ephemeral rooms**: Remove in-memory and on-disk rooms past TTL
2. **Sessions**: Delete expired sessions (grants cascade)
3. **Orphaned workspaces**: Remove empty workspaces with no grants and no whiteboards
