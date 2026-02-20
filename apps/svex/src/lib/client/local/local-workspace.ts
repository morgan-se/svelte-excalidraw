/**
 * Current local workspace (folder). Restored from IndexedDB on load when possible.
 * Reactive so UI updates when we set/restore/clear.
 */
import { get, writable } from "svelte/store";

export type LocalWorkspace = { workspaceId: string; dirHandle: FileSystemDirectoryHandle };

export const localWorkspaceStore = writable<LocalWorkspace | null>(null);

export function setLocalWorkspace(workspaceId: string, dirHandle: FileSystemDirectoryHandle): void {
	localWorkspaceStore.set({ workspaceId, dirHandle });
}

export function getLocalWorkspace(): LocalWorkspace | null {
	return get(localWorkspaceStore);
}

export function clearLocalWorkspace(): void {
	localWorkspaceStore.set(null);
}
