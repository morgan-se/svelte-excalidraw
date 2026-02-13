# `svelte-excalidraw` lib

![banner](/README.excalidraw.svg)

### Thin Svelte wrapper around [Excalidraw](https://github.com/excalidraw/excalidraw), the virtual whiteboard for sketching hand-drawn like diagrams.

[Try it in SvelteLab](https://www.sveltelab.dev/yo9bz95u2mwe5m6)

> **⚠️ Install size:** The underlying `@excalidraw/excalidraw` dependency and its peers like mermaid are large. Install size is **~185MB** across **272 packages** ([pkg-size.dev/@excalidraw](https://pkg-size.dev/@excalidraw%2Fexcalidraw@0.18.0-3a5ef40)).

## Installation

```bash
npm i svelte-excalidraw
```

## Exports

From `svelte-excalidraw`:

- **`default`** — `<Excalidraw>` component (single-user canvas).
- **`ExcalidrawMultiplayer`** — Svelte component for real-time collaborative rooms; requires an `adapter`, `roomId` and a `userInfo`.
- **`createDefaultAdapter`**, **`DefaultAdapterOptions`** — Default SvelteKit adapter; pass `{ streamUrl: (roomId) => string }` (full URL per room).
- **Types:** `RoomUserInfo`, `ExcalidrawMultiplayerAdapter`, `RoomConnection`, `RoomEvent`, `ExcalidrawDocument`, `AwarenessUpdate`.
- **Sync helpers:** `getSyncableElements`, `isSyncableElement`, `DELETED_ELEMENT_TIMEOUT_MS`.

User identity UI (provider, bar, pill) is **not** part of the package; provide `userInfo` yourself or copy the demo app’s layout (see this repo).

## Usage

```svelte
<script>
  import Excalidraw from "svelte-excalidraw";
</script>

<Excalidraw />
```

> This will render an embedded Excalidraw canvas with default behavior.

## Props

https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/

All `props` are _optional_.

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [`initialData`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/initialdata) | `object` &#124; `null` &#124; <code>Promise<object &#124; null></code> | `null` | The initial data with which app loads. |
| [`excalidrawAPI`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api) | `function` | \_ | Callback triggered with the excalidraw api once rendered |
| [`isCollaborating`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#iscollaborating) | `boolean` | \_ | This indicates if the app is in `collaboration` mode |
| [`onChange`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#onchange) | `function` | \_ | This callback is triggered whenever the component updates due to any change. This callback will receive the excalidraw `elements` and the current `app state`. |
| [`onPointerUpdate`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#onpointerupdate) | `function` | \_ | Callback triggered when mouse pointer is updated. |
| [`onPointerDown`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#onpointerdown) | `function` | \_ | This prop if passed gets triggered on pointer down events |
| [`onPointerUp`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#onpointerup) | `function` | \_ | Callback triggered on pointer up events |
| [`onScrollChange`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#onscrollchange) | `function` | \_ | This prop if passed gets triggered when scrolling the canvas. |
| [`onDuplicate`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#onduplicate) | `function` | \_ | Called when element(s) are duplicated (drag, keyboard, paste, library); can return modified elements |
| [`onPaste`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#onpaste) | `function` | \_ | Callback to be triggered if passed when something is pasted into the scene |
| [`onLibraryChange`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#onlibrarychange) | `function` | \_ | The callback if supplied is triggered when the library is updated and receives the library items. |
| [`generateLinkForSelection`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#generatelinkforselection) | `function` | \_ | Allows you to override `url` generation when linking to Excalidraw elements. |
| [`onLinkOpen`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#onlinkopen) | `function` | \_ | The callback if supplied is triggered when any link is opened. |
| [`langCode`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#langcode) | `string` | `en` | Language code string to be used in Excalidraw |
| [`onUserFollow`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#onuserfollow) | `function` | \_ | Callback when user follow/unfollow is triggered (collaboration) |
| [`onIncrement`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#onincrement) | `function` | \_ | Callback for durable/ephemeral increment events |
| [`renderTopLeftUI`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/render-props#rendertopleftui) | `function` | \_ | Render function for custom UI in top left corner |
| [`renderTopRightUI`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/render-props#rendertoprightui) | `function` | \_ | Render function that renders custom UI in top right corner |
| [`renderCustomStats`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/render-props#rendercustomstats) | `function` | \_ | Render function that can be used to render custom stats on the stats dialog. |
| [`viewModeEnabled`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#viewmodeenabled) | `boolean` | \_ | This indicates if the app is in `view` mode. |
| [`zenModeEnabled`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#zenmodeenabled) | `boolean` | \_ | This indicates if the `zen` mode is enabled |
| [`gridModeEnabled`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#gridmodeenabled) | `boolean` | \_ | This indicates if the `grid` mode is enabled |
| [`objectsSnapModeEnabled`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#objectssnapmodeenabled) | `boolean` | \_ | Whether objects snap-to-grid (or other objects) is enabled |
| [`libraryReturnUrl`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#libraryreturnurl) | `string` | \_ | What URL should [libraries.excalidraw.com](https://libraries.excalidraw.com) be installed to |
| [`theme`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#theme) | `"light"` &#124; `"dark"` | `"light"` | The theme of the Excalidraw component |
| [`name`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#name) | `string` |  | Name of the drawing |
| [`UIOptions`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/ui-options) | `object` | [DEFAULT UI OPTIONS](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/constants.ts#L151) | To customise UI options. Currently we support customising [`canvas actions`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/ui-options#canvasactions) |
| [`detectScroll`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#detectscroll) | `boolean` | `true` | Indicates whether to update the offsets when nearest ancestor is scrolled. |
| [`handleKeyboardGlobally`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#handlekeyboardglobally) | `boolean` | `false` | Indicates whether to bind the keyboard events to document. |
| [`autoFocus`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#autofocus) | `boolean` | `false` | Indicates whether to focus the Excalidraw component on page load |
| [`generateIdForFile`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#generateidforfile) | `function` | \_ | Allows you to override `id` generation for files added on canvas |
| [`validateEmbeddable`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#validateembeddable) | `string[]` \| `boolean` \| `RegExp` \| `RegExp[]` \| <code>((link: string) => boolean &#124; undefined)</code> | \_ | use for custom src url validation |
| [`renderEmbeddable`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/render-props#renderEmbeddable) | `function` | \_ | Render function that can override the built-in `<iframe>` |
| [`renderScrollbars`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#renderscrollbars) | `boolean` | `false` | Indicates whether scrollbars will be shown |
| [`showDeprecatedFonts`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props#showdeprecatedfonts) | `boolean` | \_ | Whether to show deprecated fonts in the font picker |
| `childrenBuilder` | `(mod) => React.ReactNode` | \_ | Receives the loaded Excalidraw module; return React children. When omitted, the library's default is used. |

## Children

Use the `childrenBuilder` prop: pass a function `(mod) => ...` that returns React children (e.g. built with `React.createElement(mod.MainMenu, ...)`). The wrapper passes the loaded module so you never import `@excalidraw/excalidraw` in userland. Supported [children components](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/children-components):

| Component | Description |
| --- | --- |
| [MainMenu](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/children-components/main-menu) | Top-left hamburger menu (export, save, load, etc.) |
| [WelcomeScreen](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/children-components/welcome-screen) | Centered welcome / empty-state screen |
| [Sidebar](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/children-components/sidebar) | Side panel (e.g. library) |
| [Footer](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/children-components/footer) | Footer area (desktop and/or mobile menu) |
| [LiveCollaborationTrigger](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/children-components/live-collaboration-trigger) | Button to start or join live collaboration |

See the [children example](src/routes/children/+page.svelte) in this repo (MainMenu with default items, groups, links, WelcomeScreen, Sidebar, Footer).

## Multiplayer

Real-time collaborative whiteboards: elements and cursors sync across clients. Two ways to use it:

### Batteries included (SvelteKit)

Use the built-in backend with no extra setup. The app ships with:

- **Server → client:** [sveltekit-sse](https://github.com/razshare/sveltekit-sse) — room subscription as SSE; server sends initial document, element updates, and awareness (cursors).
- **Client → server:** [SvelteKit Remote functions](https://svelte.dev/docs/kit/remote-functions) — push elements, push awareness. Server reconciles, optionally persists (e.g. to `data/excalidraw-rooms/{roomId}.json`), and broadcasts. Initial document is sent only over the stream (first SSE event: `init`).

Requirements: SvelteKit app with **room state** and a **stream** endpoint. In this repo, the handler sits next to the room page: `src/routes/multiplayer/[roomId]/+server.ts` (re-exports the lib’s stream handler). Same path as the page; POST hits the stream. Wire up room state and remotes (see `src/lib/server/` in the repo). Pass an **adapter**: use the default one with a function that returns the full URL per room (e.g. `(roomId) => \`/multiplayer/${roomId}\``).

```svelte
<script>
	import { page } from "$app/state";
  import { ExcalidrawMultiplayer, createDefaultAdapter } from "svelte-excalidraw";
</script>

<ExcalidrawMultiplayer
  adapter={createDefaultAdapter({ streamUrl: (roomId) => `/multiplayer/${roomId}` })}
  roomId={page.params.roomId!}
  userInfo={{ username: "Alice", color: { background: "#9775fa", stroke: "#9775fa" } }}
/>
```

You supply `userInfo` (username + color). The demo app in this repo implements its own user UI (provider, bar, pill) in `src/routes/multiplayer/` — that code is not exported by the package. Run the app and open `/multiplayer` for the lobby.

### Provide your own backend

Use your own transport (WebSockets, Durable Objects, Firebase, etc.) by implementing the **adapter** interface. The same `<ExcalidrawMultiplayer>` component works with any backend that fulfills the contract.

Implement `ExcalidrawMultiplayerAdapter` from `$lib/multiplayer/types.ts`:

- **`join(roomId, userInfo)`** → `Promise<RoomConnection>`: connect to the room; return `{ userId, subscribe(), leave() }`. Your backend must send an **`init`** event first (with `document`, `userId`, `collaborators`) — that is the single source of truth for the initial document. `subscribe()` then yields further events: `elements`, `awareness`, `collaborator_joined` / `collaborator_left`, etc.
- **`pushElements(roomId, userId, elements)`** — send syncable elements (lean payload).
- **`pushAwareness(roomId, userId, awareness)`** — send cursor/pointer/selection.
- Optional: `pushFiles`, `pushViewport`, `pushFollowState`, `updateUserInfo` for files, follow mode, and profile updates.

Pass your adapter as the `adapter` prop:

```svelte
<ExcalidrawMultiplayer
  roomId="my-room"
  userInfo={{ username: "Alice" }}
  adapter={myCustomAdapter}
/>
```

The default SvelteKit stack is implemented as an adapter in the package; you can mirror that shape for WebSockets, Cloudflare Durable Objects, ZeroSync, or any other pipe.

## Development

```bash
npm install
npm run dev
```

To build and package:

```bash
npm run build
npm run package
npm pack
```