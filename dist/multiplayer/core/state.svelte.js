/**
 * Runes-based multiplayer session state. Call createMultiplayerSessionState()
 * from a component so state is bound to that instance.
 */
export function createMultiplayerSessionState() {
    let initialDataResolved = false;
    let resolveRef;
    const initialData = $state(new Promise((resolve) => {
        resolveRef = resolve;
    }));
    let collaborators = $state(new Map());
    let connection = $state(null);
    function resolveInitialData(value) {
        if (initialDataResolved)
            return;
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
