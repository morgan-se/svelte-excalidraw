---
title: SVEX Config
---

# Config

Set `SVEX_CONFIG_JSON` to a JSON object. All keys are optional; defaults apply.

```json
{
  "local": { "enabled": true },
  "ephemeral": { "enabled": true, "ttlHours": 48 },
  "workspace": { "enabled": true },
  "session": { "ttlDays": 30 },
  "storage": { "maxSizePerEphemeralWhiteboardBytes": 5242880, "maxSizePerWorkspaceWhiteboardBytes": 20971520 }
}
```

## local

Local folder mode: pick a folder on your computer, each whiteboard is a file there.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | boolean | `true` | Enable local folder. |

## ephemeral

Ephemeral rooms: temporary rooms that expire after inactivity.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | boolean | `true` | Enable ephemeral rooms. |
| `ttlHours` | number | `48` | TTL in hours from last activity. |
| `createAllowedFor` | `guest` \| `trusted` \| `admin` | `guest` | Minimum user level to create. |
| `maxEphemeral` | `number` or `Record&lt;guest&#124;trusted&#124;admin, number&gt;` | `5` | Max ephemeral rooms per user (or per user type). |

## workspace

Persistent workspaces: named workspaces with custom URLs, boards don't expire.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | boolean | `true` | Enable workspaces. |
| `createAllowedFor` | `guest` \| `trusted` \| `admin` | `trusted` | Minimum user level to create. |
| `maxCollections` | `number` or `Record&lt;guest&#124;trusted&#124;admin, number&gt;` | `5` | Max collections per workspace. |
| `maxWhiteboards` | `number` or `Record&lt;guest&#124;trusted&#124;admin, number&gt;` | `50` | Max whiteboards per workspace. |
| `maxWorkspaces` | `number` or `Record&lt;guest&#124;trusted&#124;admin, number&gt;` | `3` | Max workspace grants per user (or per user type). |

## session

Session lifetime and per-user-type limits.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `ttlDays` | number | `30` | Session TTL in days from last activity. Cookie maxAge and cleanup use this. |
| `emptySessionRetentionDays` | number | `7` | Keep empty sessions (no grants) for this many days from creation. |

## storage

Size limits for whiteboards and workspaces.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `maxSizePerEphemeralWhiteboardBytes` | number | `5242880` (5 MB) | Max size per ephemeral whiteboard. Saves over this are rejected. |
| `maxSizePerWorkspaceWhiteboardBytes` | number | `20971520` (20 MB) | Max size per workspace whiteboard (local or remote). Saves over this are rejected. |
| `maxWorkspaceBytes` | number | `104857600` (100 MB) | Max size per workspace (all whiteboards). Saves over this are rejected. |
| `cleanupIntervalMinutes` | number | `15` | How often to run lifecycle cleanup (sessions, ephemeral rooms, orphaned workspaces). |
