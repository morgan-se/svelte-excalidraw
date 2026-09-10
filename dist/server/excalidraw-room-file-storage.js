/**
 * File-based persistence for excalidraw rooms (split layout).
 * Preferred: one dir per room with scene.json (elements only) and raw files in files/.
 * Register via registerFileStorage() from hooks so rooms survive restarts.
 *
 * Layout: data/excalidraw-rooms/{roomId}/scene.json, data/excalidraw-rooms/{roomId}/files/{fileId}
 */
import { readFileSync, existsSync } from "node:fs";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { setPersistCallback, setLoadCallback, getRoomDocument, } from "./excalidraw-room-state.js";
const ROOMS_DIR = join(process.cwd(), "data", "excalidraw-rooms");
const SCENE_FILE = "scene.json";
const FILES_SUBDIR = "files";
function safeRoomId(roomId) {
    if (!/^[a-zA-Z0-9_-]+$/.test(roomId))
        return "";
    return roomId;
}
/** Safe filename for a file id (no path segments). */
function safeFileId(fileId) {
    return fileId.replace(/[^a-zA-Z0-9_.-]/g, "_");
}
/** Extension from mime type for stored filenames. */
function extensionForMime(mimeType) {
    const map = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/webp": ".webp",
        "image/gif": ".gif",
        "image/svg+xml": ".svg",
        "image/bmp": ".bmp",
    };
    return map[mimeType] ?? ".bin";
}
function loadRoomSync(roomId) {
    const safe = safeRoomId(roomId);
    if (!safe)
        return null;
    const roomDir = join(ROOMS_DIR, safe);
    const scenePath = join(roomDir, SCENE_FILE);
    try {
        if (!existsSync(scenePath))
            return null;
        const raw = readFileSync(scenePath, "utf-8");
        const scene = JSON.parse(raw);
        const elements = (Array.isArray(scene.elements) ? scene.elements : []);
        const manifest = scene.fileManifest && typeof scene.fileManifest === "object" ? scene.fileManifest : {};
        const filesDir = join(roomDir, FILES_SUBDIR);
        const files = {};
        for (const [id, meta] of Object.entries(manifest)) {
            const ext = extensionForMime(meta.mimeType);
            const path = join(filesDir, safeFileId(id) + ext);
            try {
                const buf = readFileSync(path);
                const b64 = buf.toString("base64");
                const dataURL = `data:${meta.mimeType};base64,${b64}`;
                files[id] = {
                    id,
                    mimeType: meta.mimeType,
                    dataURL,
                    ...(meta.created != null && { created: meta.created }),
                    ...(meta.lastRetrieved != null && { lastRetrieved: meta.lastRetrieved }),
                };
            }
            catch {
                // skip missing file
            }
        }
        return { elements, files };
    }
    catch {
        return null;
    }
}
async function saveRoom(roomId, doc) {
    const safe = safeRoomId(roomId);
    if (!safe)
        return;
    try {
        const roomDir = join(ROOMS_DIR, safe);
        const filesDir = join(roomDir, FILES_SUBDIR);
        await mkdir(filesDir, { recursive: true });
        const fileManifest = {};
        for (const [id, f] of Object.entries(doc.files)) {
            if (!f || typeof f !== "object" || !f.dataURL)
                continue;
            const entry = f;
            fileManifest[id] = {
                mimeType: entry.mimeType,
                ...(entry.created != null && { created: entry.created }),
                ...(entry.lastRetrieved != null && { lastRetrieved: entry.lastRetrieved }),
            };
            const dataURL = entry.dataURL;
            const base64 = dataURL.includes(",") ? dataURL.slice(dataURL.indexOf(",") + 1) : "";
            const buf = Buffer.from(base64, "base64");
            const ext = extensionForMime(entry.mimeType);
            await writeFile(join(filesDir, safeFileId(id) + ext), buf);
        }
        const scene = {
            elements: doc.elements,
            fileManifest,
        };
        await writeFile(join(roomDir, SCENE_FILE), JSON.stringify(scene), "utf-8");
    }
    catch (e) {
        console.error("[excalidraw-room-file-storage] save failed:", e);
    }
}
/** Delete persisted room (entire dir). */
export async function deleteRoomFile(roomId) {
    const safe = safeRoomId(roomId);
    if (!safe)
        return;
    try {
        const roomDir = join(ROOMS_DIR, safe);
        if (existsSync(roomDir))
            await rm(roomDir, { recursive: true });
    }
    catch {
        // ignore
    }
}
/** Load room from disk (split layout). Use when room is not in memory. */
export function loadRoomFromDisk(roomId) {
    return loadRoomSync(roomId);
}
/** Export room as single payload (elements + files with dataURL). From memory or disk. */
export function exportRoomToSinglePayload(roomId) {
    return getRoomDocument(roomId) ?? loadRoomSync(roomId);
}
/** Import room from single payload (e.g. backup). Writes in split layout. */
export async function importRoomFromSinglePayload(roomId, doc) {
    await saveRoom(roomId, doc);
}
export function registerFileStorage() {
    setLoadCallback(loadRoomSync);
    setPersistCallback((roomId, doc) => {
        saveRoom(roomId, doc).catch(() => { });
    });
}
