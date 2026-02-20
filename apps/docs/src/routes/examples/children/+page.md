---
title: Children
---

<script>
  import CodeAndPreview from '$lib/CodeAndPreview.svelte';
  import * as Children from '$lib/examples/children.js';
</script>

# Children

Custom main menu, welcome screen, sidebar, and footer via the `childrenBuilder` prop (React elements). Use `UIOptions` to control layout (e.g. `dockedSidebarBreakpoint`).

<CodeAndPreview example={Children} layout="sideBySide" />
