import { sveltekit } from "@sveltejs/kit/vite";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const libRoot = path.resolve(__dirname, "../../packages/svelte-excalidraw/src/lib");

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		alias:
			process.env.NODE_ENV === "production"
				? {}
				: {
						"svelte-excalidraw": path.join(libRoot, "index.js"),
						"svelte-excalidraw/server": path.join(libRoot, "server/excalidraw-room-stream.ts"),
						"svelte-excalidraw/server/file-storage": path.join(
							libRoot,
							"server/excalidraw-room-file-storage.ts"
						),
						"svelte-excalidraw/remote": path.join(libRoot, "excalidraw-room.remote.ts")
					}
	},
});
