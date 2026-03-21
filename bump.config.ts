import { defineConfig } from "bumpp";

/** Bump only the published library; commit + tag; no push (push when you’re ready for CI). */
export default defineConfig({
	files: ["packages/svelte-excalidraw/package.json"],
	commit: "chore(svelte-excalidraw): release v%s",
	tag: "v%s",
	push: false,
	install: true,
});
