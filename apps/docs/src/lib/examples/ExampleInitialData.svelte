<script lang="ts">
	import Excalidraw from "svelte-excalidraw";

	const initialData = {
		elements: [
			{
				type: "rectangle",
				width: 300,
				height: 150,
				y: 25,
				backgroundColor: "#868dfb",
				fillStyle: "hachure",
			},
		],
		scrollToContent: true,
	};
</script>

<Excalidraw {initialData} theme="dark" viewModeEnabled gridModeEnabled />
