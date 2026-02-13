<script lang="ts">
	let { username, backgroundColor }: { username: string; backgroundColor: string } = $props();
</script>

<span class="multiplayer-user-pill" style="--cursor-color: {backgroundColor}">
	{username}
</span>

<style>
	.multiplayer-user-pill {
		font: 600 12px sans-serif;
		color: #1e1e1e;
		padding: 3px 5px;
		border-radius: 8px;
		background: var(--cursor-color, #6965db);
		border: 1px solid #fff;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
	}
</style>
