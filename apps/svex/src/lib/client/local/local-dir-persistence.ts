/**
 * Persist FileSystemDirectoryHandle in IndexedDB so we can restore after reload.
 * Chrome and other browsers that support the File System Access API allow storing
 * handles in IndexedDB.
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
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		const store = tx.objectStore(STORE);
		store.put({ workspaceId, handle }, KEY);
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
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readonly");
		const req = tx.objectStore(STORE).get(KEY);
		tx.oncomplete = () => {
			db.close();
			const v = req.result;
			if (v && typeof v === "object" && v.workspaceId && v.handle) {
				resolve({ workspaceId: v.workspaceId, handle: v.handle as FileSystemDirectoryHandle });
			} else {
				resolve(null);
			}
		};
		tx.onerror = () => {
			db.close();
			reject(tx.error);
		};
	});
}

export async function clearLocalDirFromIndexedDB(): Promise<void> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
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

/** Verify we still have permission to use the directory (e.g. after restore). */
export async function verifyDirHandle(handle: FileSystemDirectoryHandle): Promise<boolean> {
	try {
		const perm = await handle.queryPermission({ mode: "readwrite" });
		if (perm === "granted") return true;
		if (perm === "prompt") {
			const granted = await handle.requestPermission({ mode: "readwrite" });
			return granted === "granted";
		}
		return false;
	} catch {
		return false;
	}
}
