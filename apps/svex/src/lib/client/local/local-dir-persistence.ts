/**
 * Persist FileSystemDirectoryHandle in IndexedDB so we can restore after reload.
 * IndexedDB is the only browser storage that can hold FileSystemHandle.
 */
const DB_NAME = "svex";
const STORE = "local-workspace";
const KEY = "dir";

export type StoredLocalWorkspace = {
	workspaceId: string;
	handle: FileSystemDirectoryHandle;
};

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, 1);
		req.onerror = () => reject(req.error);
		req.onsuccess = () => resolve(req.result);
		req.onupgradeneeded = (e) => {
			const db = (e.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(STORE)) {
				db.createObjectStore(STORE);
			}
		};
	});
}

export async function saveLocalDirToIndexedDB(
	workspaceId: string,
	handle: FileSystemDirectoryHandle,
): Promise<void> {
	const db = await openDb();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.objectStore(STORE).put({ workspaceId, handle }, KEY);
		tx.oncomplete = () => {
			db.close();
			resolve();
		};
		tx.onerror = () => {
			db.close();
			reject(tx.error);
		};
	});
}

export async function loadLocalDirFromIndexedDB(): Promise<StoredLocalWorkspace | null> {
	const db = await openDb();
	const v = await new Promise<unknown>((resolve, reject) => {
		const tx = db.transaction(STORE, "readonly");
		const req = tx.objectStore(STORE).get(KEY);
		tx.oncomplete = () => {
			db.close();
			resolve(req.result);
		};
		tx.onerror = () => {
			db.close();
			reject(tx.error);
		};
	});
	if (v && typeof v === "object" && "workspaceId" in v && "handle" in v) {
		return { workspaceId: (v as StoredLocalWorkspace).workspaceId, handle: (v as StoredLocalWorkspace).handle };
	}
	return null;
}

export async function clearLocalDirFromIndexedDB(): Promise<void> {
	const db = await openDb();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.objectStore(STORE).delete(KEY);
		tx.oncomplete = () => {
			db.close();
			resolve();
		};
		tx.onerror = () => {
			db.close();
			reject(tx.error);
		};
	});
}

/** Handles restored from IndexedDB lose method binding; call via prototype. */
function queryPermission(handle: FileSystemHandle, mode: "read" | "readwrite"): Promise<PermissionState> {
	return FileSystemHandle.prototype.queryPermission.call(handle, { mode });
}

function requestPermission(handle: FileSystemHandle, mode: "read" | "readwrite"): Promise<PermissionState> {
	return FileSystemHandle.prototype.requestPermission.call(handle, { mode });
}

export async function verifyDirHandle(handle: FileSystemDirectoryHandle): Promise<boolean> {
	try {
		const perm = await queryPermission(handle, "readwrite");
		if (perm === "granted") return true;
		// Re-request when "prompt" or "denied" (e.g. revoked after tab was backgrounded).
		const granted = await requestPermission(handle, "readwrite");
		return granted === "granted";
	} catch {
		return false;
	}
}
