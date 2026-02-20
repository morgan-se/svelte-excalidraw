/**
 * Sections that have sub-pages and show a sidebar for sub-navigation.
 * Key = path prefix (e.g. 'examples'). Paths must start with / and the key.
 */
export interface SectionNavItem {
	path: string;
	label: string;
}

export interface SectionNav {
	label: string;
	items: SectionNavItem[];
}

export const sectionNav: Record<string, SectionNav> = {
	api: {
		label: "API",
		items: [
			{ path: "/api", label: "Overview" },
			{ path: "/api/components", label: "Components" },
			{ path: "/api/props", label: "Props" },
			{ path: "/api/children", label: "Children" },
			{ path: "/api/multiplayer", label: "Multiplayer" },
		],
	},
	examples: {
		label: "Examples",
		items: [
			{ path: "/examples", label: "Overview" },
			{ path: "/examples/basic", label: "Basic" },
			{ path: "/examples/events", label: "Events" },
			{ path: "/examples/children", label: "Children" },
			{ path: "/examples/iframe", label: "Iframe" },
		],
	},
	svex: {
		label: "SVEX",
		items: [
			{ path: "/svex", label: "Overview" },
			{ path: "/svex/self-hosting", label: "Self-hosting" },
			{ path: "/svex/self-hosting/config", label: "Config" },
			{ path: "/svex/self-hosting/storage", label: "Storage" },
		],
	},
	multiplayer: {
		label: "Multiplayer",
		items: [
			{ path: "/multiplayer", label: "Overview" },
			{ path: "/multiplayer/guide", label: "Guide" },
			{ path: "/multiplayer/adapters", label: "Adapters" },
			{ path: "/multiplayer/persistence", label: "Persistence" },
		],
	},
};

/** Path prefixes that have section nav. Longest first so we match specific paths. */
const sectionPrefixes = Object.keys(sectionNav).map((k) => `/${k}`).sort((a, b) => b.length - a.length);

export function isSectionItemActive(pathname: string, itemPath: string): boolean {
	return (pathname.replace(/\/$/, "") || "/") === (itemPath.replace(/\/$/, "") || "/");
}

/**
 * Get the section key for a pathname, or null if none.
 * Excludes e.g. /examples/iframe/embed from showing the examples sidebar.
 */
export function getSectionForPath(pathname: string): string | null {
	for (const prefix of sectionPrefixes) {
		if (pathname === prefix || pathname.startsWith(prefix + "/")) {
			if (pathname.includes("/iframe/embed")) return null;
			return prefix.slice(1);
		}
	}
	return null;
}
