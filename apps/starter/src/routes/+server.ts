import { handleExcalidrawStream } from 'svelte-excalidraw/server';

export async function POST({ request }: { request: Request }) {
	const body = (await request.json().catch(() => ({}))) as {
		roomId?: string;
		username?: string;
		color?: { background: string; stroke: string };
	};
	const roomId = body.roomId?.trim();
	const username = body.username?.trim();
	if (!roomId || !username) {
		return new Response('Missing roomId or username', { status: 400 });
	}
	return handleExcalidrawStream(request, {
		roomId,
		username,
		color: body.color,
	});
}
