import { getWorkspaceWhiteboards, getWorkspaceCollections } from "$lib/server/storage/workspace-store.js";
import { readRoomMeta } from "$lib/server/storage/room-storage.js";

export type WorkspacePreview = {
	workspaceId: string;
	collections: { collection: string; whiteboardIds: string[] }[];
	rootWhiteboardIds: string[];
};

export async function load({ parent }) {
	const { session } = await parent();
	// Show workspaces from both owned list and grants (joined via share link).
	// Exclude remote-* (local/virtual) — those are host-only, not real persistent workspaces.
	const owned = session?.workspaceIds ?? [];
	const granted = Object.keys(session?.workspaceGrants ?? {});
	const workspaceIds = [...new Set([...owned, ...granted])].filter((id) => !id.startsWith("remote-"));
	const workspacePreviews: WorkspacePreview[] = workspaceIds.map((workspaceId) => {
		const collections = getWorkspaceCollections(workspaceId);
		const inCollection = new Set(collections.flatMap((c) => c.whiteboardIds));
		const rootWhiteboardIds = getWorkspaceWhiteboards(workspaceId).filter((id) => !inCollection.has(id));
		return { workspaceId, collections, rootWhiteboardIds };
	});
	// Fetch lastUpdatedAt for ephemeral rooms (including joined) so we can show TTL
	const ephemeralIds = [
		...(session?.ephemeralRooms ?? []).map((r) => r.id),
		...Object.keys(session?.ephemeralGrants ?? {}),
	];
	const ephemeralRoomMetas = Object.fromEntries(
		[...new Set(ephemeralIds)].map((id) => {
			const meta = readRoomMeta(id);
			return [id, meta?.lastUpdatedAt ?? null] as const;
		}),
	);
	return { workspacePreviews, ephemeralRoomMetas };
}
