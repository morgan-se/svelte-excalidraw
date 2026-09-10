/**
 * Browser-only: export scene to SVG. Import from "svelte-excalidraw/export"
 * so the main entry never loads @excalidraw/excalidraw on the server (SSR-safe).
 */
export { exportToSvg } from "@excalidraw/excalidraw";
