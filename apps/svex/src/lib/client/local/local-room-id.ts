/**
 * Local workspace room id: workspaceId/segmentId (workspaceId is remote-{id}).
 * Must match between workspace list (openWhiteboard) and whiteboard page so the session is found.
 */
export function toInternalRoomIdLocal(workspaceId: string, segmentId: string): string {
	return `${workspaceId}/${segmentId}`;
}
