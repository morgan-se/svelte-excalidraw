import type { CollaboratorColorHex } from "../collaborator-colors.js";
type $$ComponentProps = {
    value: CollaboratorColorHex;
    onSelect: (hex: CollaboratorColorHex) => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};
declare const CollaboratorColorDropdown: import("svelte").Component<$$ComponentProps, {}, "">;
type CollaboratorColorDropdown = ReturnType<typeof CollaboratorColorDropdown>;
export default CollaboratorColorDropdown;
