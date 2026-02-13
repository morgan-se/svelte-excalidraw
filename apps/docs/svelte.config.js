import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { mdsvex } from "mdsvex";
import { join } from "path";
import { fileURLToPath } from "url";
import { highlighter } from "./src/lib/code-highlighter.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const mdLayout = join(__dirname, "src", "lib", "MdLayout.svelte");

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md'],
	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: ['.md'],
			layout: { _: mdLayout },
			highlight: { highlighter }
		})
	],
	kit: {
		adapter: adapter(),
		prerender: {
			entries: ['*'],
			handleHttpError: 'warn'
		},
		experimental: {
			remoteFunctions: true
		}
	},
	compilerOptions: {
		experimental: {
			async: true
		}
	}
};

export default config;
