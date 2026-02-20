---
title: Props
---

# Props

All props are optional. Full reference: [docs.excalidraw.com](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/).

| Name | Type | Description |
| --- | --- | --- |
| `initialData` | `object` &#124; `null` &#124; `Promise<object&#124;null>` | Initial data with which app loads |
| `excalidrawAPI` | `function` | Callback with the excalidraw API once rendered |
| `isCollaborating` | `boolean` | Collaboration mode |
| `onChange` | `function` | Triggered on any change; receives `elements` and `appState` |
| `onPointerUpdate` | `function` | Mouse pointer updates |
| `onPointerDown` | `function` | Pointer down events |
| `onPointerUp` | `function` | Pointer up events |
| `onScrollChange` | `function` | Canvas scroll |
| `onDuplicate` | `function` | Element duplication; can return modified elements |
| `onPaste` | `function` | Paste into scene |
| `onLibraryChange` | `function` | Library updates |
| `generateLinkForSelection` | `function` | Override URL generation for links |
| `onLinkOpen` | `function` | Link opened |
| `langCode` | `string` | Language (default `en`) |
| `onUserFollow` | `function` | Follow/unfollow (collaboration) |
| `onIncrement` | `function` | Durable/ephemeral increment events |
| `renderTopLeftUI` | `function` | Custom UI top-left |
| `renderTopRightUI` | `function` | Custom UI top-right |
| `renderCustomStats` | `function` | Custom stats in stats dialog |
| `viewModeEnabled` | `boolean` | View mode |
| `zenModeEnabled` | `boolean` | Zen mode |
| `gridModeEnabled` | `boolean` | Grid mode |
| `objectsSnapModeEnabled` | `boolean` | Snap-to-grid |
| `libraryReturnUrl` | `string` | Libraries.excalidraw.com return URL |
| `theme` | `"light"` &#124; `"dark"` | Theme (default `light`) |
| `name` | `string` | Drawing name |
| `UIOptions` | `object` | UI options (canvas actions, etc.) |
| `detectScroll` | `boolean` | Update offsets on scroll (default `true`) |
| `handleKeyboardGlobally` | `boolean` | Bind keyboard to document |
| `autoFocus` | `boolean` | Focus on load |
| `generateIdForFile` | `function` | Override ID for files |
| `validateEmbeddable` | various | Custom src validation |
| `renderEmbeddable` | `function` | Override built-in iframe |
| `renderScrollbars` | `boolean` | Show scrollbars |
| `showDeprecatedFonts` | `boolean` | Deprecated fonts in picker |
| `childrenBuilder` | `(mod) => React.ReactNode` | Custom children (MainMenu, WelcomeScreen, etc.) |
