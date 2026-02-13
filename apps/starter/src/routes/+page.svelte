<script lang="ts">
  import {
    ExcalidrawMultiplayer,
    createDefaultAdapter,
  } from "svelte-excalidraw";

  const adapter = createDefaultAdapter({
    streamUrl: () => `/`,
  });
  const roomId = "test-room";
  const userInfo = { username: "Test User" };
</script>

<h1>Excalidraw consumer test</h1>
<div class="canvas-wrap">
  <ExcalidrawMultiplayer {adapter} {roomId} {userInfo} />
</div>

<style>
  .canvas-wrap {
    width: 100%;
    height: 60vh;
    min-height: 300px;
  }
</style>
