import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [sveltekit()],
	resolve: {
		dedupe: ['react', 'react-dom']
	},
	ssr: {
		noExternal: ['clsx']
	}
};

export default config;
