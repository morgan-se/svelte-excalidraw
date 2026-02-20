---
title: Children
---

# Children

Use the `childrenBuilder` prop: pass a function `(mod) => ...` that returns React children. The wrapper passes the loaded Excalidraw module so you never import `@excalidraw/excalidraw` in userland.

```svelte
<script>
  import React from "react";
  import Excalidraw from "svelte-excalidraw";

  function buildChildren(mod) {
    const { MainMenu, WelcomeScreen } = mod;
    return React.createElement(React.Fragment, null, [
      React.createElement(MainMenu, { key: "main-menu" }),
      React.createElement(WelcomeScreen, { key: "welcome-screen" }),
    ]);
  }
</script>

<Excalidraw childrenBuilder={buildChildren} />
```

[Children components](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/children-components):

| Component | Description |
| --- | --- |
| MainMenu | Top-left hamburger menu (export, save, load, etc.) |
| WelcomeScreen | Centered welcome / empty-state screen |
| Sidebar | Side panel (e.g. library) |
| Footer | Footer area (desktop and/or mobile menu) |
| LiveCollaborationTrigger | Button to start or join live collaboration |

See the [children example](/examples/children).
