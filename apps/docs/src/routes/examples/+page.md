---
title: Examples
---

# Examples

Runnable examples that use svelte-excalidraw with different patterns.

## Run the examples

- **[Basic](/examples/basic)**: Single canvas with initial data (one rectangle). Minimal setup.
- **[Events](/examples/events)**: `onChange` and `onPointerUpdate` handlers with live feedback.
- **[Children](/examples/children)**: Custom main menu, welcome screen, sidebar, and footer (React children / slots).
- **[Multiplayer iframe](/examples/iframe)**: Two iframes sharing one room via a **custom adapter** (postMessage). No server: the parent window holds room state and broadcasts to both iframes.