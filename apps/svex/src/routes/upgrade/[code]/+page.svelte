<script lang="ts">
	import { page } from "$app/stores";
	import { browser } from "$app/environment";
	import { upgradeWithCode } from "$lib/svex.remote.js";

	let done = false;
	$effect(() => {
		if (!browser || done) return;
		const code = $page.params?.code;
		if (!code) {
			done = true;
			window.location.href = "/";
			return;
		}
		done = true;
		upgradeWithCode(code).then((out) => {
			window.location.href = "/";
		});
	});
</script>

<p>Upgrading…</p>
