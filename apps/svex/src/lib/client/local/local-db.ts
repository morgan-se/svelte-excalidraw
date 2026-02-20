/**
 * Client-only: SQLite in user folder via File System API.
 * Minimal schema: collections + whiteboards. No workspace concept.
 * Whiteboard id = docId (root) or collection/docId (in collection).
 */
import initSqlJs from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import {
	listExcalidrawFilesWithDates,
	listCollectionsFromDir,
	ensureReadWrite,
} from "$lib/client/fs-storage.js";

type SqlJsStatic = Awaited<ReturnType<typeof initSqlJs>>;
type SqlDb = InstanceType<SqlJsStatic["Database"]>;

const DB_FILENAME = "db.sqlite";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS collections (
  slug TEXT PRIMARY KEY,
  name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  viewed_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS whiteboards (
  id TEXT PRIMARY KEY,
  collection TEXT,
  doc_id TEXT NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  viewed_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_whiteboards_collection ON whiteboards(collection);
`;

let sqlJs: Promise<SqlJsStatic> | null = null;

async function getSql(): Promise<SqlJsStatic> {
	if (!sqlJs) sqlJs = initSqlJs({ locateFile: () => wasmUrl });
	return sqlJs;
}

function wbId(collection: string | null, docId: string): string {
	return collection ? `${collection}/${docId}` : docId;
}

async function loadOrCreateDb(dirHandle: FileSystemDirectoryHandle): Promise<SqlDb> {
	const Sql = await getSql();
	let bytes: Uint8Array;
	try {
		const f = await dirHandle.getFileHandle(DB_FILENAME);
		const buf = await (await f.getFile()).arrayBuffer();
		bytes = new Uint8Array(buf);
	} catch (e) {
		if ((e as { name?: string })?.name === "NotFoundError") bytes = new Uint8Array(0);
		else throw e;
	}
	const db = bytes.length ? new Sql.Database(bytes) : new Sql.Database();
	db.run(SCHEMA);
	return db;
}

async function saveDb(dirHandle: FileSystemDirectoryHandle, db: SqlDb): Promise<void> {
	const data = db.export();
	const copy = new Uint8Array(data.length);
	copy.set(data);
	const f = await dirHandle.getFileHandle(DB_FILENAME, { create: true });
	await ensureReadWrite(f as FileSystemFileHandle);
	const w = await (f as FileSystemFileHandle).createWritable();
	await w.write(copy);
	await w.close();
}

/**
 * Sync db.sqlite from filesystem. Dir is authoritative.
 * Creates db if missing. On schema error, deletes and retries once.
 */
export async function ensureLocalDbInFolder(
	dirHandle: FileSystemDirectoryHandle,
): Promise<void> {
	const attempt = async (): Promise<void> => {
		const db = await loadOrCreateDb(dirHandle);
		const rootFiles = await listExcalidrawFilesWithDates(dirHandle);
		const collections = await listCollectionsFromDir(dirHandle);
		const now = Date.now();

		const colIns = db.prepare(
			`INSERT OR REPLACE INTO collections (slug, name, created_at, updated_at, viewed_at)
       VALUES (?, ?, ?, ?, ?)`,
		);
		const wbIns = db.prepare(
			`INSERT OR REPLACE INTO whiteboards (id, collection, doc_id, name, created_at, updated_at, viewed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
		);

		const seenCols = new Set<string>();
		const seenWbIds = new Set<string>();

		for (const col of collections) {
			seenCols.add(col.collection);
			colIns.bind([col.collection, col.collection, now, now, now]);
			colIns.step();
			colIns.reset();

			for (const wb of col.whiteboardIds ?? []) {
				const subdir = await dirHandle.getDirectoryHandle(col.dirName);
				const files = await listExcalidrawFilesWithDates(subdir);
				const info = files.find((f) => f.base === wb);
				const m = info?.lastModified ?? now;
				const id = wbId(col.collection, wb);
				seenWbIds.add(id);
				wbIns.bind([id, col.collection, wb, wb, m, m, now]);
				wbIns.step();
				wbIns.reset();
			}
		}
		colIns.free();

		for (const { base, lastModified } of rootFiles) {
			const id = wbId(null, base);
			seenWbIds.add(id);
			wbIns.bind([id, null, base, base, lastModified, lastModified, now]);
			wbIns.step();
			wbIns.reset();
		}
		wbIns.free();

		// Prune removed
		const rows = db.exec("SELECT id FROM whiteboards");
		if (rows[0]?.values) {
			for (const [id] of rows[0].values as [string][]) {
				if (!seenWbIds.has(id)) db.run("DELETE FROM whiteboards WHERE id = ?", [id]);
			}
		}
		const colRows = db.exec("SELECT slug FROM collections");
		if (colRows[0]?.values) {
			for (const [slug] of colRows[0].values as [string][]) {
				if (!seenCols.has(slug)) db.run("DELETE FROM collections WHERE slug = ?", [slug]);
			}
		}

		await saveDb(dirHandle, db);
	};

	try {
		await attempt();
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		if (msg.includes("constraint") || msg.includes("NOT NULL")) {
			try {
				await dirHandle.removeEntry(DB_FILENAME);
			} catch {}
			await attempt();
		} else throw e;
	}
}
