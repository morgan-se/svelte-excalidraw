import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		dedupe: ['react', 'react-dom']
	},
	ssr: {
		noExternal: ['clsx']
	}
});
