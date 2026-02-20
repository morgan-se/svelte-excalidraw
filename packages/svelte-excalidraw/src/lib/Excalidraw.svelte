<script module lang="ts">
  export type OnChangeArgs = {
    elements: ExcalidrawElement[];
    appState: AppState;
    files: BinaryFiles;
  };
  export type OnPointerUpdateArgs = {
    userId: string;
    pointer: {
      x: number;
      y: number;
      tool: "pointer" | "laser";
    };
    button: "up" | "down";
    pointersMap: Gesture["pointers"];
  };
</script>

<script lang="ts">
  import { browser } from "$app/environment";
  import "./hotfix/processNotDefined.js";
  import "@excalidraw/excalidraw/index.css";

  import ReactComponent from "./ReactComponent.svelte";
  type ExcalidrawElement = any;
  import type {
    AppProps,
    AppState,
    BinaryFiles,
    ExcalidrawImperativeAPI,
    ExcalidrawInitialDataState,
    Gesture,
  } from "@excalidraw/excalidraw/types";

  import type { JSX, ReactNode } from "react";

  // https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/
  interface Props {
    initialData?:
      | ExcalidrawInitialDataState
      | null
      | Promise<ExcalidrawInitialDataState | null>;
    excalidrawAPI?: ExcalidrawImperativeAPI;
    isCollaborating?: boolean;
    langCode?: string;
    viewModeEnabled?: boolean;
    zenModeEnabled?: boolean;
    gridModeEnabled?: boolean;
    objectsSnapModeEnabled?: boolean;
    libraryReturnUrl?: string;
    theme?: "light" | "dark";
    name?: string;
    UIOptions?: AppProps["UIOptions"];
    detectScroll?: boolean;
    handleKeyboardGlobally?: boolean;
    autoFocus?: boolean;
    onInit?: (api: ExcalidrawImperativeAPI) => void;
    onChange?: (
      elements: OnChangeArgs["elements"],
      appState: OnChangeArgs["appState"],
      files: OnChangeArgs["files"],
    ) => void;
    onPointerUpdate?: (pointerUpdate: OnPointerUpdateArgs) => void;
    onPointerDown?: (activeTool: string, pointerDownState: any) => void;
    onPointerUp?: (activeTool: string, pointerDownState: any) => void;
    onScrollChange?: (scrollX: number, scrollY: number) => void;
    onDuplicate?: (
      nextElements: readonly ExcalidrawElement[],
      prevElements: readonly ExcalidrawElement[],
    ) => ExcalidrawElement[] | void;
    onPaste?: (data: DataTransfer, event: ClipboardEvent) => boolean | void;
    onLibraryChange?: (items: any[]) => void;
    generateLinkForSelection?: (
      elements: readonly ExcalidrawElement[],
      appState: AppState,
    ) => string | void;
    onLinkOpen?: (element: any, event: MouseEvent) => void;
    onUserFollow?: (payload: {
      userToFollow: any;
      action: "FOLLOW" | "UNFOLLOW";
    }) => void;
    onIncrement?: (event: any) => void;
    renderTopLeftUI?: (
      isMobile: boolean,
      appState: AppState,
    ) => JSX.Element | null;
    renderTopRightUI?: (isMobile: boolean, appState: AppState) => JSX.Element;
    renderCustomStats?: (
      elements: readonly ExcalidrawElement[],
      appState: AppState,
    ) => JSX.Element;
    generateIdForFile?: (file: File) => string;
    validateEmbeddable?:
      | string[]
      | boolean
      | RegExp
      | RegExp[]
      | ((link: string) => boolean | undefined);
    renderEmbeddable?: (element: any) => JSX.Element | null;
    renderScrollbars?: boolean;
    showDeprecatedFonts?: boolean;
    /**
     * Receives the loaded Excalidraw module; return React children (MainMenu, WelcomeScreen, Sidebar, Footer, etc.).
     * When omitted, the library's default is used.
     */
    childrenBuilder?: (
      mod: typeof import("@excalidraw/excalidraw"),
    ) => ReactNode;
    /**
     * React children to customize the UI. Supported components: MainMenu, WelcomeScreen,
     * Sidebar, Footer, LiveCollaborationTrigger. When omitted, the library’s default is used.
     * @see https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/children-components
     */
  }

  function setAPI(api: ExcalidrawImperativeAPI) {
    excalidrawAPI = api;
    requestAnimationFrame(() => onInit?.(api));
  }

  let {
    excalidrawAPI = $bindable(undefined as any),
    onInit,
    childrenBuilder,
    ...excalidrawProps
  }: Props = $props();
</script>

<div class="excalidraw-root">
  {#if browser}
    {#await import("@excalidraw/excalidraw")}
      <div class="loadingBox">Loading Excalidraw...</div>
    {:then mod}
      {@const resolvedChildren = childrenBuilder?.(mod)}
      <ReactComponent
        excalidrawAPI={setAPI}
        this={mod.Excalidraw}
        children={resolvedChildren}
        {...excalidrawProps}
      />
    {/await}
  {/if}
</div>

<style>
  .excalidraw-root {
    /* Works by default in any app: no parent height required. */
    min-height: 60vh;
    height: 100%;
  }
  .loadingBox {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    min-height: 300px;
    font-size: 1.5rem;
  }
</style>
