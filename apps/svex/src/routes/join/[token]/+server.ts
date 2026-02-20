import { redirect } from "@sveltejs/kit";
import { getOrCreateSessionId } from "$lib/server/auth/session-cookie.js";
import { consumeShareToken } from "$lib/server/auth/share-token.js";
import { patchSession } from "$lib/server/auth/session-store.js";
import { whiteboardUrl } from "$lib/core/whiteboard-url.js";
import { getWorkspaceCollections } from "$lib/server/storage/workspace-store.js";
import { ensureEphemeralWhiteboard } from "$lib/server/storage/room-meta-db.js";

export const prerender = false;

/** Consume share token: add grant to session, redirect to whiteboard. */
export function GET({
	params,
	cookies,
}: {
	params: { token: string };
	cookies: { get: (n: string) => string | undefined; set: (n: string, v: string, o: object) => void };
}) {
	const payload = consumeShareToken(params.token);
	if (!payload) {
		throw redirect(302, "/");
	}
	const sid = getOrCreateSessionId(cookies);
	if (payload.kind === "workspace" && payload.workspaceId) {
		// roomId "_" = workspace root; "collectionName" (no slash) = collection; else specific whiteboard
		if (payload.roomId === "_") {
			patchSession(sid, {
				addWorkspaceGrant: { workspaceId: payload.workspaceId, access: payload.access },
			});
			throw redirect(302, `/workspace/${payload.workspaceId}`);
		}
		if (payload.roomId && !payload.roomId.includes("/")) {
			const collections = getWorkspaceCollections(payload.workspaceId);
			const isCollection = collections.some((c) => c.collection === payload.roomId);
			if (isCollection) {
				patchSession(sid, {
					addWorkspaceGrant: { workspaceId: payload.workspaceId, access: payload.access },
				});
				throw redirect(302, `/workspace/${payload.workspaceId}/${payload.roomId}`);
			}
		}
		// Specific whiteboard: add whiteboard-level grant
		const fullRoomId = `${payload.workspaceId}/${payload.roomId}`;
		patchSession(sid, {
			addWhiteboardGrant: { roomId: fullRoomId, access: payload.access },
		});
		throw redirect(302, whiteboardUrl(payload.workspaceId, payload.roomId));
	}
	if (payload.kind === "local" && payload.workspaceId) {
		patchSession(sid, {
			addWorkspaceGrant: { workspaceId: payload.workspaceId, access: payload.access },
		});
		throw redirect(302, whiteboardUrl(payload.workspaceId, payload.roomId));
	}
	if (payload.kind === "ephemeral") {
		ensureEphemeralWhiteboard(payload.roomId);
		patchSession(sid, {
			addEphemeralGrant: { id: payload.roomId, access: payload.access },
		});
		throw redirect(302, whiteboardUrl("ephemeral", payload.roomId));
	}
	throw redirect(302, "/");
}
