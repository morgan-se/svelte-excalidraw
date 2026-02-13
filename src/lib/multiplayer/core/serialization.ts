/**
 * File serialization for multiplayer sync.
 */

import type { BinaryFiles } from "@excalidraw/excalidraw/types";
import type { SerializedFile } from "$lib/multiplayer/types.js";

/** Serialize BinaryFiles to wire format. Uses dataURL when string; converts Blob to dataURL async. */
export async function serializeFilesAsync(
	files: BinaryFiles,
): Promise<Record<string, SerializedFile>> {
	const out: Record<string, SerializedFile> = {};
	const blobEntries: [string, { f: (typeof files)[string]; blob: Blob }][] = [];
	for (const [id, f] of Object.entries(files)) {
		if (!f || !f.id) continue;
		const dataURL = (f as { dataURL?: string }).dataURL;
		const data = (f as { data?: Blob }).data;
		if (typeof dataURL === "string") {
			out[id] = {
				mimeType: f.mimeType,
				id: f.id,
				dataURL,
				...(f.created != null && { created: f.created }),
				...(f.lastRetrieved != null && { lastRetrieved: f.lastRetrieved }),
			};
		} else if (data instanceof Blob) {
			blobEntries.push([id, { f, blob: data }]);
		}
	}
	for (const [id, { f, blob }] of blobEntries) {
		const dataURL = await new Promise<string>((resolve, reject) => {
			const r = new FileReader();
			r.onload = () => resolve(r.result as string);
			r.onerror = () => reject(r.error);
			r.readAsDataURL(blob);
		});
		out[id] = {
			mimeType: f.mimeType,
			id: f.id,
			dataURL,
			...(f.created != null && { created: f.created }),
			...(f.lastRetrieved != null && { lastRetrieved: f.lastRetrieved }),
		};
	}
	return out;
}
