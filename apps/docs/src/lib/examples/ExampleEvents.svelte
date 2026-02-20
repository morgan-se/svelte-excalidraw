<script lang="ts">
  import Excalidraw from "svelte-excalidraw";

  let lastChange = "-";
  let lastPointer = "-";

  function handleChange(elements: unknown[], _appState: unknown, _files: unknown) {
    lastChange = `Elements: ${elements.length}`;
  }

  function handlePointer(pointerUpdate: { pointer: { x: number; y: number; tool: string } }) {
    lastPointer = `x: ${pointerUpdate.pointer.x}, y: ${pointerUpdate.pointer.y}, tool: ${pointerUpdate.pointer.tool}`;
  }
</script>

<main class="events-page">
  <aside class="events-bar">
    <div><strong>Last Change:</strong> {lastChange}</div>
    <div><strong>Pointer Update:</strong> {lastPointer}</div>
  </aside>

  <section class="events-canvas">
    <Excalidraw
      onChange={handleChange}
      onPointerUpdate={handlePointer}
      autoFocus={true}
    />
  </section>
</main>

<style>
  .events-page {
    display: grid;
    grid-template-rows: auto 1fr;
    height: 100%;
    min-height: 0;
  }

  .events-bar {
    padding: 1rem;
    background: var(--border, #27272a);
    color: var(--text, #e4e4e7);
    font-family: monospace;
    font-size: 0.9rem;
    display: flex;
    justify-content: space-between;
    gap: 2rem;
    flex-shrink: 0;
  }

  .events-canvas {
    width: 100%;
    height: 100%;
    min-height: 0;
  }
</style>
