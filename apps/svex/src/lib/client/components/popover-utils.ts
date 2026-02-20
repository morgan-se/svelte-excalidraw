/** Show popover by id, register outside-click to hide. Returns hide function. */
export function showPopover(
	id: string,
	options?: { exclude?: Element },
): () => void {
	const popover = document.getElementById(id) as HTMLDivElement & { showPopover?: () => void; hidePopover?: () => void };
	const exclude = options?.exclude ?? popover?.previousElementSibling;
	popover?.showPopover?.();
	const hide = () => {
		document.removeEventListener("click", onOutside);
		popover?.hidePopover?.();
	};
	const onOutside = (e: MouseEvent) => {
		const target = e.target as Node;
		if (popover && !popover.contains(target) && (!exclude || !exclude.contains(target))) hide();
	};
	setTimeout(() => document.addEventListener("click", onOutside), 0);
	return hide;
}
