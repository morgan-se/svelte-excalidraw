<script lang="ts">
	import { browser } from "$app/environment";
	import "$lib/../app.css";
	import favicon from "$lib/assets/favicon.png";
	import { setLocalWorkspace } from "$lib/client/local/local-workspace.js";
	import {
		loadLocalDirFromIndexedDB,
		verifyDirHandle,
		clearLocalDirFromIndexedDB,
	} from "$lib/client/local/local-dir-persistence.js";

	let { data, children } = $props();

	if (browser) {
		(async () => {
			const stored = await loadLocalDirFromIndexedDB();
			if (!stored) return;
			const ok = await verifyDirHandle(stored.handle);
			if (ok) {
				setLocalWorkspace(stored.workspaceId, stored.handle);
			} else {
				await clearLocalDirFromIndexedDB();
			}
		})();
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
