<script lang="ts">
	import { browser } from "$app/environment";
	import WhiteboardPage from "$lib/client/components/WhiteboardPage.svelte";
	import { writeSceneToFile, type ExcalidrawDoc } from "$lib/client/fs-storage.js";
	import { getLocalHostSession } from "$lib/client/local/local-host-session.js";
	import { getLocalWorkspace, localWorkspaceStore } from "$lib/client/local/local-workspace.js";
	import { getRemoteRoomScene } from "$lib/svex.remote.js";
	import { whiteboardUrl } from "$lib/core/whiteboard-url.js";

	let { data } = $props();
	const workspaceId = $derived(data?.workspaceId ?? "");
	const segmentId = $derived(data?.roomId ?? "");
	const access = $derived(data?.access ?? "readWrite");
	const isEphemeral = $derived(data?.isEphemeral ?? false);
	const isEphemeralCreator = $derived(data?.isEphemeralCreator ?? false);
	const ephemeralTtlHours = $derived(data?.flags?.ephemeralTtlHours);
	const isLocalWorkspace = $derived(workspaceId.startsWith("remote-"));

	const internalRoomId = $derived(isEphemeral ? segmentId : `${workspaceId}/${segmentId}`);
	const backHref = $derived(
		isEphemeral ? "/" : isLocalWorkspace
			? ($localWorkspaceStore?.workspaceId === workspaceId ? "/workspace/local" : "/")
			: segmentId.includes("/")
				? `/workspace/${workspaceId}/${segmentId.split("/")[0]}`
				: `/workspace/${workspaceId}`,
	);
	const displayId = $derived(`${workspaceId}/${segmentId}`);
	const streamUrl = $derived(() => whiteboardUrl(workspaceId, segmentId));

	const isLocalHost = $derived(
		isLocalWorkspace && browser && !!getLocalHostSession(internalRoomId) && getLocalWorkspace()?.workspaceId === workspaceId,
	);
	const shareUrl = $derived.by(() => {
		if (!browser || !isLocalWorkspace) return "";
		return `${window.location.origin}${whiteboardUrl(workspaceId, segmentId)}`;
	});

	function getJoinExtras(rid: string) {
		if (!isLocalWorkspace) return { workspaceKind: isEphemeral ? ("ephemeral" as const) : ("forever" as const) };
		const session = getLocalHostSession(rid);
		if (session) {
			return {
				workspaceKind: "local" as const,
				initialDocument: {
					elements: Array.isArray(session.doc.elements) ? session.doc.elements : [],
					files: session.doc.files && typeof session.doc.files === "object" ? session.doc.files : {},
				},
			};
		}
		return { workspaceKind: "forever" as const };
	}

	function syncEffect() {
		if (!isLocalWorkspace || !browser || !internalRoomId) return;
		const session = getLocalHostSession(internalRoomId);
		if (!session) return;
		const interval = setInterval(async () => {
			try {
				const doc = await getRemoteRoomScene({ workspaceId, segmentId });
				await writeSceneToFile(session.dirHandle, session.filenameBase, doc as ExcalidrawDoc);
			} catch {
				// ignore
			}
		}, 2000);
		return () => clearInterval(interval);
	}
</script>

<WhiteboardPage
	{workspaceId}
	{segmentId}
	{internalRoomId}
	{access}
	streamUrl={streamUrl}
	{getJoinExtras}
	{backHref}
	{displayId}
	title="Whiteboard {displayId}"
	{isEphemeral}
	{isEphemeralCreator}
	{ephemeralTtlHours}
	accessDeniedMessage="You don't have access to this whiteboard."
	accessDeniedHref={isEphemeral ? undefined : isLocalWorkspace ? "/" : `/workspace/${workspaceId}`}
	showShareButtons={!isLocalWorkspace || (isLocalHost && !!shareUrl)}
	shareUrlOverride={isLocalWorkspace && isLocalHost && shareUrl ? shareUrl : undefined}
	{syncEffect}
	session={data?.session}
	flags={data?.flags}
/>
