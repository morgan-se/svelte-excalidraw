/**
 * File serialization for multiplayer sync.
 */
/** Serialize BinaryFiles to wire format. Uses dataURL when string; converts Blob to dataURL async. */
export async function serializeFilesAsync(files) {
    const out = {};
    const blobEntries = [];
    for (const [id, f] of Object.entries(files)) {
        if (!f || !f.id)
            continue;
        const dataURL = f.dataURL;
        const data = f.data;
        if (typeof dataURL === "string") {
            out[id] = {
                mimeType: f.mimeType,
                id: f.id,
                dataURL,
                ...(f.created != null && { created: f.created }),
                ...(f.lastRetrieved != null && { lastRetrieved: f.lastRetrieved }),
            };
        }
        else if (data instanceof Blob) {
            blobEntries.push([id, { f, blob: data }]);
        }
    }
    for (const [id, { f, blob }] of blobEntries) {
        const dataURL = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
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
