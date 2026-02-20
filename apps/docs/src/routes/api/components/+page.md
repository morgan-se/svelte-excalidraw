---
title: Components
---

# Components

## Excalidraw

Default export. Single-player canvas. Props follow `@excalidraw/excalidraw` (e.g. `initialData`, `excalidrawAPI`, `theme`, `viewModeEnabled`, `onChange`, etc.).

```svelte
<script>
  import Excalidraw from "svelte-excalidraw";
</script>

<Excalidraw
  initialData={{ elements: [], appState: {} }}
  theme="dark"
  onChange={(elements, appState) => console.log(elements)}
/>
```

## ExcalidrawMultiplayer

Multiplayer canvas. Props: `roomId`, `userInfo`, `adapter`, optional `theme`, `UIOptions`.

```svelte
<script>
  import { ExcalidrawMultiplayer, createDefaultAdapter } from "svelte-excalidraw";

  const adapter = createDefaultAdapter({ streamUrl: (roomId) => `/room/${roomId}` });
</script>

<ExcalidrawMultiplayer
  roomId="my-room"
  userInfo={{ username: "Alice", color: { background: "#6965db", stroke: "#6965db" } }}
  {adapter}
/>
```

For adapter, types, server, persistence: [Multiplayer API](/api/multiplayer).

## CollaboratorProfile

User identity UI: username input and color picker. Use with `ExcalidrawMultiplayer`.

```svelte
<script>
  import { CollaboratorProfile, COLLABORATOR_COLORS } from "svelte-excalidraw";
  import type { CollaboratorColorHex } from "svelte-excalidraw";

  let username = $state("");
  let color = $state<CollaboratorColorHex>(COLLABORATOR_COLORS[0]!);
</script>

<CollaboratorProfile bind:username bind:color placeholder="Your name" />
```

Props: `username` (bindable), `color` (bindable, `CollaboratorColorHex`), `placeholder`, `label`.

## COLLABORATOR_COLORS

Array of hex strings for the collaborator color palette.

```ts
import { COLLABORATOR_COLORS } from "svelte-excalidraw";
// e.g. { background: COLLABORATOR_COLORS[0], stroke: COLLABORATOR_COLORS[0] }
```
