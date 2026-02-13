<script lang="ts">
	import Excalidraw from 'svelte-excalidraw';

	const initialData = {
		elements: [
			{
				type: 'rectangle',
				id: 'rect-1',
				x: 100,
				y: 100,
				width: 300,
				height: 200,
				angle: 0,
				strokeColor: '#000000',
				backgroundColor: '#868dfb',
				fillStyle: 'hachure',
				strokeWidth: 1,
				strokeStyle: 'solid',
				roughness: 1,
				opacity: 100,
				version: 1,
				versionNonce: 1,
				isDeleted: false,
				seed: 1,
				groupIds: [],
				roundness: null,
				boundElements: null,
				updated: 1
			}
		],
		appState: { viewBackgroundColor: '#ffffff', gridSize: null },
		scrollToContent: true
	};
</script>

<Excalidraw
	{initialData}
	theme="light"
	viewModeEnabled={false}
	gridModeEnabled={true}
/>
