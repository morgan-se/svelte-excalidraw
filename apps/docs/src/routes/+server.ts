import { handleExcalidrawStream } from "svelte-excalidraw/server";
import { roomExists } from "svelte-excalidraw/server/state";
import { getLandingDefaultScene } from "$lib/landing/default-scene.js";

/** Stream is server-only; demo uses persist: false (in-memory). */
export const prerender = false;

/**
 * POST / - multiplayer stream. roomId, username, color from body. No auth.
 * persist: false for demo (in-memory only).
 * New rooms get a default scene with shapes and emojis.
 */
export async function POST({ request }: { request: Request }) {
	const body = (await request.json().catch(() => ({}))) as {
		roomId?: string;
		username?: string;
		color?: { background: string; stroke: string };
	};
	const roomId = body.roomId?.trim();
	const username = body.username?.trim();
	if (!roomId || !username) {
		return new Response("Missing roomId or username", { status: 400 });
	}
	const initialDocument = !roomExists(roomId) ? getLandingDefaultScene(roomId) : undefined;
	return handleExcalidrawStream(request, {
		roomId,
		username,
		color: body.color,
		initialDocument,
		persist: false, // demo only: in-memory, no disk
	});
}
