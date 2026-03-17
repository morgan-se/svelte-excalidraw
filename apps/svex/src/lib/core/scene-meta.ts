/**
 * Embedded scene metadata (svexMeta) in Excalidraw JSON. Same shape for local .excalidraw and server scene.json.
 * Dir/file is source of truth; SQLite on server is a fast index.
 */
import type { RoomMetadata } from "./types/workspace-types.js";
import type { SvexSceneMeta } from "./types/workspace-types.js";

export const SVEX_META_KEY = "svexMeta";

export function getSvexMeta(doc: { svexMeta?: SvexSceneMeta }): SvexSceneMeta | null {
	const raw = doc?.svexMeta;
	if (!raw || typeof raw !== "object") return null;
	const createdAt = typeof raw.createdAt === "number" ? raw.createdAt : 0;
	const updatedAt = typeof raw.updatedAt === "number" ? raw.updatedAt : createdAt;
	return {
		createdAt,
		updatedAt,
		viewedAt: typeof raw.viewedAt === "number" ? raw.viewedAt : undefined,
		name: typeof raw.name === "string" ? raw.name : undefined,
		description: typeof raw.description === "string" ? raw.description : undefined,
	};
}

/** Convert file svexMeta to RoomMetadata (lastUpdatedAt for backend). */
export function roomMetadataFromSvexMeta(s: SvexSceneMeta): RoomMetadata {
	return {
		createdAt: s.createdAt,
		lastUpdatedAt: s.updatedAt,
		viewedAt: s.viewedAt,
		name: s.name,
		description: s.description,
	};
}

/** Convert RoomMetadata to SvexSceneMeta for writing to file. */
export function svexMetaFromRoomMetadata(r: RoomMetadata): SvexSceneMeta {
	return {
		createdAt: r.createdAt,
		updatedAt: r.lastUpdatedAt,
		viewedAt: r.viewedAt,
		name: r.name,
		description: r.description,
	};
}

/**
 * Ensure doc has svexMeta suitable for saving. Mutates doc.
 * - If doc has no svexMeta or no createdAt: set createdAt and updatedAt to now (new doc).
 * - Else: set updatedAt to now, keep createdAt and optional viewedAt/name/description.
 */
export function ensureSvexMetaForSave(
	doc: Record<string, unknown>,
	now: number,
	existingMeta?: RoomMetadata | null,
): SvexSceneMeta {
	const current = getSvexMeta(doc as { svexMeta?: SvexSceneMeta });
	const createdAt = current?.createdAt ?? existingMeta?.createdAt ?? now;
	const updatedAt = now;
	const viewedAt = existingMeta?.viewedAt ?? current?.viewedAt;
	const name = existingMeta?.name ?? current?.name;
	const description = existingMeta?.description ?? current?.description;
	const meta: SvexSceneMeta = {
		createdAt,
		updatedAt,
		...(viewedAt != null && { viewedAt }),
		...(name != null && name !== "" && { name }),
		...(description != null && description !== "" && { description }),
	};
	(doc as Record<string, unknown>)[SVEX_META_KEY] = meta;
	return meta;
}

/** Build minimal scene JSON with svexMeta first (for server creating new whiteboard dir). */
export function createInitialSceneJson(now: number): string {
	const meta: SvexSceneMeta = { createdAt: now, updatedAt: now };
	return JSON.stringify(
		{ [SVEX_META_KEY]: meta, elements: [], files: {} },
		null,
		2,
	);
}
