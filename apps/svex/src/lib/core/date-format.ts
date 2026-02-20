/** Human relative time (e.g. "2 min ago") or short date if older. */
export function formatDateAgo(ts: number | null): string {
	if (ts == null) return "NULL";
	const now = Date.now();
	const d = now - ts;
	if (d < 60_000) return "just now";
	if (d < 3600_000) return `${Math.floor(d / 60_000)} min ago`;
	if (d < 86400_000) return `${Math.floor(d / 3600_000)} h ago`;
	if (d < 604_800_000) return `${Math.floor(d / 86400_000)} days ago`;
	return new Date(ts).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: ts < now - 365 * 86400_000 ? "numeric" : undefined,
	});
}
