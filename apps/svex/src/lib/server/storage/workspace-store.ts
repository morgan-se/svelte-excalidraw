/**
 * Server-only: persistent workspaces. Collections = subdirectories. Slug only, no id.
 * - Root whiteboards: workspaces/<id>/<whiteboardId>/
 * - Collection: workspaces/<id>/<collection>/ (subdir)
 * - Collection whiteboard: workspaces/<id>/<collection>/<whiteboardId>/
 * Meta in SQLite; scene in scene.json.
 */
import { mkdirSync, existsSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateRoomCode } from "$lib/core/room-code.js";
import { getConfig } from "$lib/server/config.js";
import { WORKSPACES_DIR } from "./data-dir.js";
import { getDb } from "./db.js";
import { deleteWhiteboard, upsertWhiteboard } from "./room-meta-db.js";

const SCENE_FILE = "scene.json";

export interface Collection {
	collection: string;
	name?: string;
	description?: string;
	whiteboardIds: string[];
}

const COLLECTION_SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$|^[a-z0-9]$/;

function slugify(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "")
		.replace(/^-+|-+$/g, "")
		.replace(/-+/g, "-") || "col";
}

export function isValidCollectionSlug(slug: string): boolean {
	return COLLECTION_SLUG_REGEX.test(slug);
}

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$|^[a-z0-9]$/;

function safeWorkspaceId(id: string): string {
	return /^[a-zA-Z0-9_-]+$/.test(id) ? id : "";
}

export function isValidWorkspaceSlug(slug: string): boolean {
	return SLUG_REGEX.test(slug);
}

export function existsWorkspace(workspaceId: string): boolean {
	const safe = safeWorkspaceId(workspaceId);
	if (!safe) return false;
	const db = getDb();
	const row = db.prepare("SELECT 1 FROM workspaces WHERE id = ? AND is_remote = 0").get(safe);
	return !!row;
}

/** Create workspace. If slug provided, use as workspaceId (vanity URL); must be valid and not taken. */
export function createWorkspace(slug?: string): string {
	let workspaceId: string;
	if (slug != null && slug !== "") {
		const s = slug.toLowerCase().trim();
		if (!isValidWorkspaceSlug(s)) throw new Error("Invalid slug: use 2–50 chars, a-z, 0-9, hyphens");
		if (existsWorkspace(s)) throw new Error("Slug already taken");
		workspaceId = s;
	} else {
		workspaceId = generateRoomCode();
	}
	const dir = join(WORKSPACES_DIR, safeWorkspaceId(workspaceId));
	mkdirSync(dir, { recursive: true });
	const now = Date.now();
	getDb()
		.prepare(
			"INSERT INTO workspaces (id, is_remote, name, created_at, updated_at, viewed_at) VALUES (?, 0, ?, ?, ?, ?)",
		)
		.run(workspaceId, workspaceId, now, now, now);
	return workspaceId;
}

/** Root whiteboard = dir in workspace root that has scene.json. */
function listRootWhiteboardDirs(workspaceDir: string): string[] {
	if (!existsSync(workspaceDir)) return [];
	const entries = readdirSync(workspaceDir, { withFileTypes: true });
	const result: string[] = [];
	for (const e of entries) {
		if (!e.isDirectory()) continue;
		if (e.name.endsWith(".json")) continue;
		const subPath = join(workspaceDir, e.name);
		if (existsSync(join(subPath, SCENE_FILE))) result.push(e.name);
	}
	return result;
}

/** Collection = subdir that does NOT have scene.json at top level (contains whiteboard subdirs). */
function listCollectionSlugs(workspaceDir: string): string[] {
	if (!existsSync(workspaceDir)) return [];
	const entries = readdirSync(workspaceDir, { withFileTypes: true });
	const result: string[] = [];
	for (const e of entries) {
		if (!e.isDirectory()) continue;
		if (e.name.endsWith(".json")) continue;
		const subPath = join(workspaceDir, e.name);
		if (!existsSync(join(subPath, SCENE_FILE))) result.push(e.name);
	}
	return result;
}

/** All whiteboard ids = root dirs + collection dirs. Merge with DB for created-but-unsaved. */
export function getWorkspaceWhiteboards(workspaceId: string): string[] {
	const safe = safeWorkspaceId(workspaceId);
	if (!safe) return [];
	const dir = join(WORKSPACES_DIR, safe);
	const root = listRootWhiteboardDirs(dir);
	const collections = listCollectionSlugs(dir);
	const inCollections: string[] = [];
	for (const slug of collections) {
		const colPath = join(dir, slug);
		const subEntries = readdirSync(colPath, { withFileTypes: true });
		for (const e of subEntries) {
			if (e.isDirectory() && existsSync(join(colPath, e.name, SCENE_FILE))) {
				inCollections.push(e.name);
			}
		}
	}
	const fromDirs = new Set([...root, ...inCollections]);
	const fromDb = getDb()
		.prepare("SELECT doc_id FROM whiteboards WHERE workspace_id = ?")
		.all(safe) as { doc_id: string }[];
	for (const row of fromDb) fromDirs.add(row.doc_id);
	return [...fromDirs];
}

const EMPTY_SCENE = JSON.stringify({ elements: [], files: {} });

export function addWhiteboardToWorkspace(
	workspaceId: string,
	whiteboardId: string,
	name?: string,
): boolean {
	const safe = safeWorkspaceId(workspaceId);
	if (!safe) return false;
	const dir = join(WORKSPACES_DIR, safe);
	mkdirSync(dir, { recursive: true });
	const whiteboardDir = join(dir, whiteboardId);
	if (!existsSync(whiteboardDir)) {
		if (getWorkspaceWhiteboards(workspaceId).length >= getMaxWhiteboards()) return false;
		mkdirSync(whiteboardDir, { recursive: true });
		writeFileSync(join(whiteboardDir, SCENE_FILE), EMPTY_SCENE);
	}
	const roomId = `${workspaceId}/${whiteboardId}`;
	const now = Date.now();
	upsertWhiteboard(roomId, {
		createdAt: now,
		lastUpdatedAt: now,
		viewedAt: now,
		name: name ?? undefined,
	});
	return true;
}

export function removeWhiteboardFromWorkspace(workspaceId: string, whiteboardId: string): boolean {
	const safe = safeWorkspaceId(workspaceId);
	if (!safe) return false;
	const rows = getDb()
		.prepare("SELECT id FROM whiteboards WHERE workspace_id = ? AND doc_id = ?")
		.all(safe, whiteboardId) as { id: string }[];
	for (const row of rows) deleteWhiteboard(row.id);
	return rows.length > 0;
}

export function getWorkspaceCollections(workspaceId: string): Collection[] {
	const safe = safeWorkspaceId(workspaceId);
	if (!safe) return [];
	const dir = join(WORKSPACES_DIR, safe);
	const slugs = listCollectionSlugs(dir);
	const dbRows = getDb()
		.prepare("SELECT slug, name, description FROM collections WHERE workspace_id = ?")
		.all(safe) as { slug: string; name: string | null; description: string | null }[];
	const metaBySlug = new Map(dbRows.map((r) => [r.slug, { name: r.name ?? undefined, description: r.description ?? undefined }]));
	return slugs.map((collection) => {
		const colPath = join(dir, collection);
		const entries = readdirSync(colPath, { withFileTypes: true });
		const whiteboardIds = entries
			.filter((e) => e.isDirectory() && existsSync(join(colPath, e.name, SCENE_FILE)))
			.map((e) => e.name);
		const meta = metaBySlug.get(collection);
		return { collection, name: meta?.name, description: meta?.description, whiteboardIds };
	});
}

export function getCollectionBySlug(workspaceId: string, collection: string): Collection | null {
	const cols = getWorkspaceCollections(workspaceId);
	return cols.find((c) => c.collection === collection) ?? null;
}

function getMaxCollections(): number {
	const config = getConfig();
	const n = config.workspace.maxCollections;
	if (typeof n === "number") return n;
	if (n && typeof n === "object") return n.guest ?? n.trusted ?? n.admin ?? 5;
	return 5;
}

function getMaxWhiteboards(): number {
	const config = getConfig();
	const n = config.workspace.maxWhiteboards;
	if (typeof n === "number") return n;
	if (n && typeof n === "object") return n.guest ?? n.trusted ?? n.admin ?? 50;
	return 50;
}

function slugifyWhiteboardName(name: string): string {
	const s = slugify(name);
	return s && /^[a-zA-Z0-9_-]+$/.test(s) ? s : generateRoomCode();
}

export function createWhiteboardInWorkspace(
	workspaceId: string,
	name?: string,
): { whiteboardId: string } | { error: string } {
	const safe = safeWorkspaceId(workspaceId);
	if (!safe) return { error: "Invalid workspace" };
	const existing = new Set(getWorkspaceWhiteboards(workspaceId));
	if (existing.size >= getMaxWhiteboards()) return { error: "Max whiteboards reached" };
	let whiteboardId: string;
	if (name?.trim()) {
		const base = slugifyWhiteboardName(name.trim());
		whiteboardId = base;
		let n = 0;
		while (existing.has(whiteboardId)) whiteboardId = `${base}-${++n}`;
	} else {
		whiteboardId = generateRoomCode();
	}
	const ok = addWhiteboardToWorkspace(workspaceId, whiteboardId, name?.trim());
	return ok ? { whiteboardId } : { error: "Invalid workspace" };
}

export function createCollection(workspaceId: string, nameInput: string): { collection: string } | { error: string } {
	const safe = safeWorkspaceId(workspaceId);
	if (!safe) return { error: "Invalid workspace" };
	const dir = join(WORKSPACES_DIR, safe);
	const existing = listCollectionSlugs(dir);
	if (existing.length >= getMaxCollections()) return { error: "Max collections reached" };
	const name = nameInput.trim() || "Collection";
	const base = slugify(name);
	if (!base) return { error: "Invalid collection name" };
	let collection = base;
	let n = 0;
	while (existing.includes(collection)) collection = `${base}-${++n}`;
	if (!isValidCollectionSlug(collection)) return { error: "Invalid collection: use 2–50 chars, a-z, 0-9, hyphens" };
	mkdirSync(join(dir, collection), { recursive: true });
	const now = Date.now();
	getDb()
		.prepare(
			"INSERT INTO collections (workspace_id, slug, name, description, created_at, updated_at, viewed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
		)
		.run(safe, collection, name, null, now, now, now);
	return { collection };
}

export function deleteCollection(workspaceId: string, collection: string): boolean {
	const safe = safeWorkspaceId(workspaceId);
	if (!safe) return false;
	const dir = join(WORKSPACES_DIR, safe);
	const colPath = join(dir, collection);
	if (!existsSync(colPath)) return false;
	const rows = getDb()
		.prepare("SELECT id, doc_id FROM whiteboards WHERE workspace_id = ? AND collection = ?")
		.all(safe, collection) as { id: string; doc_id: string }[];
	const now = Date.now();
	for (const row of rows) {
		deleteWhiteboard(row.id);
		const newRoomId = `${workspaceId}/${row.doc_id}`;
		upsertWhiteboard(newRoomId, { createdAt: now, lastUpdatedAt: now, viewedAt: now });
	}
	// Move all whiteboard dirs to root
	const entries = readdirSync(colPath, { withFileTypes: true });
	for (const e of entries) {
		if (e.isDirectory() && existsSync(join(colPath, e.name, SCENE_FILE))) {
			const from = join(colPath, e.name);
			const to = join(dir, e.name);
			if (!existsSync(to)) renameSync(from, to);
		}
	}
	rmSync(colPath, { recursive: true, force: true });
	getDb().prepare("DELETE FROM collections WHERE workspace_id = ? AND slug = ?").run(safe, collection);
	return true;
}

export function addWhiteboardToCollection(workspaceId: string, collection: string, whiteboardId: string): boolean {
	const safe = safeWorkspaceId(workspaceId);
	if (!safe) return false;
	const dir = join(WORKSPACES_DIR, safe);
	const colPath = join(dir, collection);
	const from = join(dir, whiteboardId);
	const to = join(colPath, whiteboardId);
	if (!existsSync(from) || !existsSync(join(from, SCENE_FILE))) return false;
	if (existsSync(to)) return true;
	mkdirSync(join(dir, collection), { recursive: true });
	renameSync(from, to);
	const oldRoomId = `${workspaceId}/${whiteboardId}`;
	const newRoomId = `${workspaceId}/${collection}/${whiteboardId}`;
	deleteWhiteboard(oldRoomId);
	const now = Date.now();
	upsertWhiteboard(newRoomId, { createdAt: now, lastUpdatedAt: now, viewedAt: now });
	return true;
}

export function removeWhiteboardFromCollection(workspaceId: string, collection: string, whiteboardId: string): boolean {
	const safe = safeWorkspaceId(workspaceId);
	if (!safe) return false;
	const dir = join(WORKSPACES_DIR, safe);
	const from = join(dir, collection, whiteboardId);
	const to = join(dir, whiteboardId);
	if (!existsSync(from)) return false;
	if (existsSync(to)) return false;
	renameSync(from, to);
	const oldRoomId = `${workspaceId}/${collection}/${whiteboardId}`;
	const newRoomId = `${workspaceId}/${whiteboardId}`;
	deleteWhiteboard(oldRoomId);
	const now = Date.now();
	upsertWhiteboard(newRoomId, { createdAt: now, lastUpdatedAt: now, viewedAt: now });
	return true;
}

export function renameCollection(
	workspaceId: string,
	oldCollection: string,
	newCollection: string,
	displayName?: string,
): boolean {
	const safe = safeWorkspaceId(workspaceId);
	if (!safe) return false;
	const dir = join(WORKSPACES_DIR, safe);
	const from = join(dir, oldCollection);
	const to = join(dir, newCollection);
	if (!existsSync(from)) return false;
	if (existsSync(to)) return false;
	const base = slugify((displayName ?? newCollection).trim() || "col");
	if (!base || base !== newCollection) return false;
	if (!isValidCollectionSlug(newCollection)) return false;
	renameSync(from, to);
	const db = getDb();
	db.prepare("UPDATE collections SET slug = ?, name = ?, updated_at = ? WHERE workspace_id = ? AND slug = ?").run(
		newCollection,
		displayName?.trim() ?? newCollection,
		Date.now(),
		safe,
		oldCollection,
	);
	const rows = db
		.prepare("SELECT id, doc_id FROM whiteboards WHERE workspace_id = ? AND collection = ?")
		.all(safe, oldCollection) as { id: string; doc_id: string }[];
	for (const row of rows) {
		deleteWhiteboard(row.id);
		const newRoomId = `${workspaceId}/${newCollection}/${row.doc_id}`;
		const now = Date.now();
		upsertWhiteboard(newRoomId, { createdAt: now, lastUpdatedAt: now, viewedAt: now });
	}
	return true;
}

export function deleteWorkspace(workspaceId: string): boolean {
	const safe = safeWorkspaceId(workspaceId);
	if (!safe) return false;
	const dir = join(WORKSPACES_DIR, safe);
	if (!existsSync(dir)) return false;
	// Delete all whiteboards from DB and disk
	const rows = getDb()
		.prepare("SELECT id FROM whiteboards WHERE workspace_id = ?")
		.all(safe) as { id: string }[];
	for (const row of rows) deleteWhiteboard(row.id);
	getDb().prepare("DELETE FROM whiteboards WHERE workspace_id = ?").run(safe);
	getDb().prepare("DELETE FROM collections WHERE workspace_id = ?").run(safe);
	getDb().prepare("DELETE FROM workspaces WHERE id = ?").run(safe);
	rmSync(dir, { recursive: true, force: true });
	return true;
}

/** Delete workspaces that have no session grants and no whiteboards. Returns deleted workspace ids. */
export function cleanupOrphanedEmptyWorkspaces(): string[] {
	const db = getDb();
	const rows = db
		.prepare(
			`SELECT id FROM workspaces WHERE is_remote = 0
       AND id NOT IN (SELECT workspace_id FROM session_grants WHERE workspace_id IS NOT NULL)
       AND id NOT IN (SELECT workspace_id FROM whiteboards WHERE workspace_id IS NOT NULL)`,
		)
		.all() as { id: string }[];
	const ids = rows.map((r) => r.id);
	for (const id of ids) {
		deleteWorkspace(id);
	}
	return ids;
}

export function renameWhiteboard(
	workspaceId: string,
	oldId: string,
	newId: string,
	collection?: string,
	displayName?: string,
): boolean {
	const safe = safeWorkspaceId(workspaceId);
	if (!safe) return false;
	const dir = join(WORKSPACES_DIR, safe);
	const from = collection ? join(dir, collection, oldId) : join(dir, oldId);
	const to = collection ? join(dir, collection, newId) : join(dir, newId);
	if (!existsSync(from) || !existsSync(join(from, SCENE_FILE))) return false;
	if (existsSync(to)) return false;
	if (!/^[a-zA-Z0-9_-]+$/.test(newId) || newId.length > 128) return false;
	renameSync(from, to);
	const oldRoomId = collection ? `${workspaceId}/${collection}/${oldId}` : `${workspaceId}/${oldId}`;
	const newRoomId = collection ? `${workspaceId}/${collection}/${newId}` : `${workspaceId}/${newId}`;
	deleteWhiteboard(oldRoomId);
	const now = Date.now();
	upsertWhiteboard(newRoomId, {
		createdAt: now,
		lastUpdatedAt: now,
		viewedAt: now,
		name: displayName?.trim() ?? newId,
	});
	return true;
}
