/**
 * Runes-based multiplayer session state. Call createMultiplayerSessionState()
 * from a component so state is bound to that instance.
 */

import type { ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";
import type { Collaborator } from "@excalidraw/excalidraw/types";
import type { RoomConnection } from "$lib/multiplayer/types.js";

export interface MultiplayerSessionState {
	get initialData(): Promise<ExcalidrawInitialDataState>;
	resolveInitialData(value: ExcalidrawInitialDataState): void;
	get collaborators(): Map<string, Collaborator>;
	set collaborators(value: Map<string, Collaborator>);
	get connection(): RoomConnection | null;
	set connection(value: RoomConnection | null);
}

export function createMultiplayerSessionState(): MultiplayerSessionState {
	let initialDataResolved = false;
	let resolveRef: (value: ExcalidrawInitialDataState) => void;
	const initialData = $state<Promise<ExcalidrawInitialDataState>>(
		new Promise((resolve) => {
			resolveRef = resolve;
		}),
	);
	let collaborators = $state<Map<string, Collaborator>>(new Map());
	let connection = $state<RoomConnection | null>(null);

	function resolveInitialData(value: ExcalidrawInitialDataState) {
		if (initialDataResolved) return;
		initialDataResolved = true;
		resolveRef(value);
	}

	return {
		get initialData() {
			return initialData;
		},
		resolveInitialData,
		get collaborators() {
			return collaborators;
		},
		set collaborators(value) {
			collaborators = value;
		},
		get connection() {
			return connection;
		},
		set connection(value) {
			connection = value;
		},
	};
}
