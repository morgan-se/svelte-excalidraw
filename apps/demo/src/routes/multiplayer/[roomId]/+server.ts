import { handleExcalidrawStream } from "svelte-excalidraw/server";

export async function POST({
	request,
	params,
}: {
	request: Request;
	params: { roomId: string };
}) {
	// Auth here if you have it; this demo does not.
	const body = (await request.json().catch(() => ({}))) as {
		username?: string;
		color?: { background: string; stroke: string };
	};
	const roomId = params.roomId;
	const username = body.username?.trim();
	if (!roomId || !username) {
		return new Response("Missing roomId or username", { status: 400 });
	}
	return handleExcalidrawStream(request, {
		roomId,
		username,
		color: body.color,
	});
}
