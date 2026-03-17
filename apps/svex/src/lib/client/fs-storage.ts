/**
 * Browser-only: read/write .excalidraw file in a FileSystemDirectoryHandle.
 * Used for "Open folder" (local workspace) host: read on load, write back on updates.
 *
 * Collections = subdirectories. Slug is the dir name. No .svex-collections.json.
 * svexMeta (createdAt, updatedAt, etc.) is embedded in each file; written first in JSON so listing can peek.
 */

import { getSvexMeta, ensureSvexMetaForSave, SVEX_META_KEY } from "$lib/core/scene-meta.js";
import type { SvexSceneMeta } from "$lib/core/types/workspace-types.js";

export const SCENE_FILENAME = "scene.excalidraw";

export type ExcalidrawDoc = {
	elements?: readonly Record<string, unknown>[];
	files?: Record<string, unknown>;
	[key: string]: unknown;
};

/** Whiteboard list item with embedded meta (1:1 with backend shape: id, name, createdAt, lastUpdatedAt). */
export type LocalWhiteboardMeta = {
	base: string;
	createdAt: number;
	updatedAt: number;
	name?: string;
	description?: string;
};

/** Normalize raw .excalidraw JSON (export format has type, version, appState, elements, files) to our shape. */
export function normalizeExcalidrawDoc(raw: ExcalidrawDoc | null): ExcalidrawDoc {
	if (!raw || typeof raw !== "object") {
		return { elements: [], files: {} };
	}
	const elements = Array.isArray(raw.elements) ? raw.elements : [];
	const files = raw.files && typeof raw.files === "object" ? raw.files : {};
	return { ...raw, elements, files };
}

/** Sanitize a user-entered name for use as .excalidraw filename base (no path chars). */
export function sanitizeWhiteboardName(name: string): string {
	const s = name.replace(/[/\\:*?"<>|]/g, "_").trim();
	return s || "";
}

/** Check if File System Access API is available. */
export function isFsAccessSupported(): boolean {
	return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

type HandleWithPermission = FileSystemHandle & {
	queryPermission?(opts: { mode: string }): Promise<string>;
	requestPermission?(opts: { mode: string }): Promise<string>;
};

/** Request readwrite permission before writing. Needed on Android/SAF where handles can be read-only. */
export async function ensureReadWrite(handle: FileSystemFileHandle): Promise<void> {
	// Handles restored from IndexedDB lose method binding; call via prototype to avoid Illegal invocation.
	const proto = FileSystemHandle.prototype as unknown as HandleWithPermission;
	const queryPermission = proto.queryPermission;
	const requestPermission = proto.requestPermission;
	if (typeof queryPermission !== "function") return;

	const q = await queryPermission.call(handle, { mode: "readwrite" });
	if (q === "granted") return;

	if (typeof requestPermission !== "function") return;
	const r = await requestPermission.call(handle, { mode: "readwrite" });
	if (r !== "granted") throw new Error("No write permission for this file handle");
}

/**
 * Pick a directory (readwrite). Returns handle or null if user cancelled.
 */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
	if (!isFsAccessSupported()) return null;
	try {
		return await (window as unknown as { showDirectoryPicker(options: { mode: string }): Promise<FileSystemDirectoryHandle> })
			.showDirectoryPicker({ mode: "readwrite" });
	} catch {
		return null;
	}
}

const EXCALIDRAW_EXT = ".excalidraw";

/** List base names of .excalidraw files in the directory (e.g. ["scene", "board1"]). */
export async function listExcalidrawFiles(dir: FileSystemDirectoryHandle): Promise<string[]> {
	const names: string[] = [];
	for await (const [name] of dir.entries()) {
		if (name.endsWith(EXCALIDRAW_EXT)) {
			names.push(name.slice(0, -EXCALIDRAW_EXT.length));
		}
	}
	return names.sort();
}

const PEEK_BYTES = 8192;

/** Peek svexMeta from start of file (we write svexMeta first in JSON). */
async function readSvexMetaFromFile(
	dir: FileSystemDirectoryHandle,
	filenameBase: string,
): Promise<SvexSceneMeta | null> {
	const filename = filenameBase.endsWith(EXCALIDRAW_EXT) ? filenameBase : filenameBase + EXCALIDRAW_EXT;
	try {
		const fileHandle = await dir.getFileHandle(filename);
		const file = await fileHandle.getFile();
		const blob = file.size <= PEEK_BYTES ? file : file.slice(0, PEEK_BYTES);
		const text = await blob.text();
		const doc = JSON.parse(text) as ExcalidrawDoc;
		return getSvexMeta(doc);
	} catch {
		return null;
	}
}

/** List .excalidraw files with embedded meta (createdAt, updatedAt, name, description). Peek each file for svexMeta; fallback to lastModified. */
export async function listExcalidrawFilesWithMeta(
	dir: FileSystemDirectoryHandle,
): Promise<LocalWhiteboardMeta[]> {
	const result: LocalWhiteboardMeta[] = [];
	for await (const [name] of dir.entries()) {
		if (!name.endsWith(EXCALIDRAW_EXT)) continue;
		const base = name.slice(0, -EXCALIDRAW_EXT.length);
		let lastModified = 0;
		try {
			const fileHandle = await dir.getFileHandle(name);
			const file = await fileHandle.getFile();
			lastModified = file.lastModified;
		} catch {}
		const meta = await readSvexMetaFromFile(dir, base);
		const updatedAt = meta?.updatedAt ?? lastModified;
		const createdAt = meta?.createdAt ?? updatedAt;
		result.push({
			base,
			createdAt,
			updatedAt,
			...(meta?.name != null && meta.name !== "" && { name: meta.name }),
			...(meta?.description != null && meta.description !== "" && { description: meta.description }),
		});
	}
	return result.sort((a, b) => a.base.localeCompare(b.base));
}

/** @deprecated Use listExcalidrawFilesWithMeta. Kept for compatibility. */
export async function listExcalidrawFilesWithDates(
	dir: FileSystemDirectoryHandle,
): Promise<{ base: string; lastModified: number }[]> {
	const list = await listExcalidrawFilesWithMeta(dir);
	return list.map((w) => ({ base: w.base, lastModified: w.updatedAt }));
}

/** Delete an .excalidraw file from the directory. filename = base name without .excalidraw. */
export async function deleteExcalidrawFile(
	dir: FileSystemDirectoryHandle,
	filenameBase: string,
): Promise<void> {
	const filename = filenameBase.endsWith(EXCALIDRAW_EXT) ? filenameBase : filenameBase + EXCALIDRAW_EXT;
	await dir.removeEntry(filename);
}

/** Read scene from a file in the directory. filename = base name without .excalidraw. */
export async function readSceneFromFile(
	dir: FileSystemDirectoryHandle,
	filenameBase: string,
): Promise<ExcalidrawDoc | null> {
	const filename = filenameBase.endsWith(EXCALIDRAW_EXT) ? filenameBase : filenameBase + EXCALIDRAW_EXT;
	try {
		const fileHandle = await dir.getFileHandle(filename);
		const file = await fileHandle.getFile();
		const text = await file.text();
		return JSON.parse(text) as ExcalidrawDoc;
	} catch (e) {
		if ((e as { name?: string })?.name === "NotFoundError") return null;
		throw e;
	}
}

/** Write scene to a file in the directory. Ensures svexMeta is set and written first in JSON for listing peek. */
export async function writeSceneToFile(
	dir: FileSystemDirectoryHandle,
	filenameBase: string,
	doc: ExcalidrawDoc,
): Promise<void> {
	const now = Date.now();
	ensureSvexMetaForSave(doc as Record<string, unknown>, now);
	// Serialize with svexMeta first so listExcalidrawFilesWithMeta can peek
	const d = doc as Record<string, unknown>;
	const ordered =
		typeof d[SVEX_META_KEY] !== "undefined"
			? { [SVEX_META_KEY]: d[SVEX_META_KEY], ...Object.fromEntries(Object.entries(d).filter(([k]) => k !== SVEX_META_KEY)) }
			: doc;
	const filename = filenameBase.endsWith(EXCALIDRAW_EXT) ? filenameBase : filenameBase + EXCALIDRAW_EXT;
	const fileHandle = await dir.getFileHandle(filename, { create: true });
	await ensureReadWrite(fileHandle as FileSystemFileHandle);
	const writable = await (fileHandle as FileSystemFileHandle).createWritable();
	await writable.write(JSON.stringify(ordered, null, 2));
	await writable.close();
}

/** Read scene from the chosen directory (legacy: single scene.excalidraw). */
export async function readSceneFromDir(dir: FileSystemDirectoryHandle): Promise<ExcalidrawDoc | null> {
	return readSceneFromFile(dir, SCENE_FILENAME.slice(0, -EXCALIDRAW_EXT.length));
}

/** Write scene to scene.excalidraw (legacy). */
export async function writeSceneToDir(
	dir: FileSystemDirectoryHandle,
	doc: ExcalidrawDoc,
): Promise<void> {
	return writeSceneToFile(dir, SCENE_FILENAME.slice(0, -EXCALIDRAW_EXT.length), doc);
}

/** Collection = subdirectory. collection = identifier (URL-safe). dirName = actual fs name for getDirectoryHandle. */
export type LocalCollection = { collection: string; dirName: string; whiteboardIds: string[] };

function slugifyDirName(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "")
		.replace(/^-+|-+$/g, "")
		.replace(/-+/g, "-") || "col";
}

/** List collections = subdirectories. collection = slugified dir name for URL. */
export async function listCollectionsFromDir(
	rootDir: FileSystemDirectoryHandle,
): Promise<LocalCollection[]> {
	const result: LocalCollection[] = [];
	for await (const [name, handle] of rootDir.entries()) {
		if (handle.kind !== "directory") continue;
		if (name.startsWith(".")) continue;
		const collection = slugifyDirName(name);
		if (!collection) continue;
		const subdir = await rootDir.getDirectoryHandle(name);
		const files = await listExcalidrawFilesWithMeta(subdir);
		result.push({
			collection,
			dirName: name,
			whiteboardIds: files.map((f) => f.base),
		});
	}
	return result.sort((a, b) => a.collection.localeCompare(b.collection));
}

/** List whiteboards in a collection subdir with meta (createdAt, updatedAt, name, description). */
export async function listWhiteboardsInCollection(
	rootDir: FileSystemDirectoryHandle,
	dirName: string,
): Promise<LocalWhiteboardMeta[]> {
	const subdir = await rootDir.getDirectoryHandle(dirName);
	return listExcalidrawFilesWithMeta(subdir);
}

export function slugifyCollectionName(name: string): string {
	return slugifyDirName(name);
}

/** Create collection = create subdirectory. Uses collection as dir name. */
export async function createCollectionDir(
	rootDir: FileSystemDirectoryHandle,
	collection: string,
): Promise<void> {
	const safe = slugifyDirName(collection) || "col";
	await rootDir.getDirectoryHandle(safe, { create: true });
}

/** Move file from root to collection subdir. dirName = actual fs dir name. */
export async function moveFileToCollection(
	rootDir: FileSystemDirectoryHandle,
	dirName: string,
	base: string,
): Promise<void> {
	const doc = await readSceneFromFile(rootDir, base);
	if (!doc) return;
	const subdir = await rootDir.getDirectoryHandle(dirName, { create: true });
	await writeSceneToFile(subdir, base, doc);
	await deleteExcalidrawFile(rootDir, base);
}

/** Move file from collection subdir to root. */
export async function moveFileFromCollection(
	rootDir: FileSystemDirectoryHandle,
	dirName: string,
	base: string,
): Promise<void> {
	const subdir = await rootDir.getDirectoryHandle(dirName);
	const doc = await readSceneFromFile(subdir, base);
	if (!doc) return;
	await writeSceneToFile(rootDir, base, doc);
	await deleteExcalidrawFile(subdir, base);
}

/** Delete collection = move all files to root, remove dir. */
export async function deleteCollectionDir(
	rootDir: FileSystemDirectoryHandle,
	dirName: string,
): Promise<void> {
	const subdir = await rootDir.getDirectoryHandle(dirName);
	const files = await listExcalidrawFiles(subdir);
	for (const base of files) {
		await moveFileFromCollection(rootDir, dirName, base);
	}
	await rootDir.removeEntry(dirName);
}

/** Rename collection = create new dir, move files, remove old. */
export async function renameCollectionDir(
	rootDir: FileSystemDirectoryHandle,
	oldDirName: string,
	newCollection: string,
): Promise<void> {
	const safe = slugifyDirName(newCollection) || "col";
	if (safe === oldDirName) return;
	const subdir = await rootDir.getDirectoryHandle(oldDirName);
	const files = await listExcalidrawFiles(subdir);
	const newDir = await rootDir.getDirectoryHandle(safe, { create: true });
	for (const base of files) {
		const doc = await readSceneFromFile(subdir, base);
		if (!doc) continue;
		await writeSceneToFile(newDir, base, doc);
		await deleteExcalidrawFile(subdir, base);
	}
	await rootDir.removeEntry(oldDirName);
}

/** Rename whiteboard file = read, write to new name, delete old. */
export async function renameWhiteboardFile(
	dir: FileSystemDirectoryHandle,
	oldBase: string,
	newBase: string,
): Promise<void> {
	const doc = await readSceneFromFile(dir, oldBase);
	if (!doc) return;
	const safe = sanitizeWhiteboardName(newBase) || oldBase;
	if (safe === oldBase) return;
	await writeSceneToFile(dir, safe, doc);
	await deleteExcalidrawFile(dir, oldBase);
}
