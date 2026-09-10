import type { CollaboratorColorHex } from "../collaborator-colors.js";
type $$ComponentProps = {
    username?: string;
    color: CollaboratorColorHex;
    placeholder?: string;
    label?: string;
};
declare const CollaboratorProfile: import("svelte").Component<$$ComponentProps, {}, "username" | "color">;
type CollaboratorProfile = ReturnType<typeof CollaboratorProfile>;
export default CollaboratorProfile;
