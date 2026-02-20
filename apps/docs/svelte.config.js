import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { mdsvex } from "mdsvex";
import rehypeHeadingId from "./src/lib/rehype-heading-id.js";
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
			highlight: { highlighter },
			rehypePlugins: [rehypeHeadingId]
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
