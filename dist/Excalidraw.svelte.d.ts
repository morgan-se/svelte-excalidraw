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
import "./hotfix/processNotDefined.js";
import "@excalidraw/excalidraw/index.css";
import type { AppProps, AppState, BinaryFiles, ExcalidrawImperativeAPI, ExcalidrawInitialDataState, Gesture } from "@excalidraw/excalidraw/types";
import type { JSX, ReactNode } from "react";
type ExcalidrawElement = any;
interface Props {
    initialData?: ExcalidrawInitialDataState | null | Promise<ExcalidrawInitialDataState | null>;
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
    onChange?: (elements: OnChangeArgs["elements"], appState: OnChangeArgs["appState"], files: OnChangeArgs["files"]) => void;
    onPointerUpdate?: (pointerUpdate: OnPointerUpdateArgs) => void;
    onPointerDown?: (activeTool: string, pointerDownState: any) => void;
    onPointerUp?: (activeTool: string, pointerDownState: any) => void;
    onScrollChange?: (scrollX: number, scrollY: number) => void;
    onDuplicate?: (nextElements: readonly ExcalidrawElement[], prevElements: readonly ExcalidrawElement[]) => ExcalidrawElement[] | void;
    onPaste?: (data: DataTransfer, event: ClipboardEvent) => boolean | void;
    onLibraryChange?: (items: any[]) => void;
    generateLinkForSelection?: (elements: readonly ExcalidrawElement[], appState: AppState) => string | void;
    onLinkOpen?: (element: any, event: MouseEvent) => void;
    onUserFollow?: (payload: {
        userToFollow: any;
        action: "FOLLOW" | "UNFOLLOW";
    }) => void;
    onIncrement?: (event: any) => void;
    renderTopLeftUI?: (isMobile: boolean, appState: AppState) => JSX.Element | null;
    renderTopRightUI?: (isMobile: boolean, appState: AppState) => JSX.Element;
    renderCustomStats?: (elements: readonly ExcalidrawElement[], appState: AppState) => JSX.Element;
    generateIdForFile?: (file: File) => string;
    validateEmbeddable?: string[] | boolean | RegExp | RegExp[] | ((link: string) => boolean | undefined);
    renderEmbeddable?: (element: any) => JSX.Element | null;
    renderScrollbars?: boolean;
    showDeprecatedFonts?: boolean;
    /**
     * Receives the loaded Excalidraw module; return React children (MainMenu, WelcomeScreen, Sidebar, Footer, etc.).
     * When omitted, the library's default is used.
     */
    childrenBuilder?: (mod: typeof import("@excalidraw/excalidraw")) => ReactNode;
}
declare const Excalidraw: import("svelte").Component<Props, {}, "excalidrawAPI">;
type Excalidraw = ReturnType<typeof Excalidraw>;
export default Excalidraw;
