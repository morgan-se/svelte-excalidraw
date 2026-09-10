/**
 * Collaborator map normalization and room-event application.
 */
export function normalizeCollaborator(id, collaborator) {
    return {
        ...collaborator,
        id: collaborator.id ?? id,
        socketId: collaborator.socketId ?? id,
    };
}
/** Apply a room event to a collaborator map; returns a new Map or the same if no change. */
export function applyCollaboratorEvent(current, ev) {
    switch (ev.type) {
        case "awareness": {
            const c = current.get(ev.userId);
            if (!c)
                return current;
            const pointer = ev.awareness.pointer ?? c.pointer;
            const next = new Map(current);
            next.set(ev.userId, {
                ...c,
                pointer,
                button: ev.awareness.button,
                selectedElementIds: ev.awareness.selectedElementIds ?? {},
            });
            return next;
        }
        case "collaborator_joined": {
            const next = new Map(current);
            next.set(ev.collaborator.id, normalizeCollaborator(ev.collaborator.id, ev.collaborator));
            return next;
        }
        case "collaborator_updated": {
            const next = new Map(current);
            next.set(ev.collaborator.id, normalizeCollaborator(ev.collaborator.id, ev.collaborator));
            return next;
        }
        case "collaborator_left": {
            const next = new Map(current);
            next.delete(ev.userId);
            return next;
        }
        case "init":
            if (ev.collaborators) {
                const next = new Map();
                for (const [id, c] of Object.entries(ev.collaborators)) {
                    next.set(id, normalizeCollaborator(id, c));
                }
                return next;
            }
            return current;
        case "sync": {
            const next = new Map();
            for (const [id, c] of Object.entries(ev.collaborators)) {
                next.set(id, normalizeCollaborator(id, c));
            }
            return next;
        }
        default:
            // elements, files, viewport, followed_by: no collaborator change
            return current;
    }
}
