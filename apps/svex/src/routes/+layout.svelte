<script lang="ts">
	import { browser } from "$app/environment";
	import "$lib/../app.css";
	import favicon from "$lib/assets/favicon.png";
	import { setLocalWorkspace } from "$lib/client/local/local-workspace.js";
	import { loadLocalDirFromIndexedDB, verifyDirHandle } from "$lib/client/local/local-dir-persistence.js";

	let { data, children } = $props();

	if (browser) {
		(async () => {
			const stored = await loadLocalDirFromIndexedDB();
			if (!stored) return;
			if (await verifyDirHandle(stored.handle)) {
				setLocalWorkspace(stored.workspaceId, stored.handle);
			}
			// When verification fails (e.g. permission revoked after tab was backgrounded),
			// keep the handle in IndexedDB so the whiteboard page can try to re-request access.
		})();
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
