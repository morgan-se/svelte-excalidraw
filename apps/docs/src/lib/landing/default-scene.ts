/**
 * Default scene for new landing rooms: structured center (header + subtitle),
 * 4 shapes at axis positions, optional curved arrows between adjacent shapes.
 */
import type { RoomDocument } from "svelte-excalidraw/server/state";

const COLORS = [
	"#3bc9db",
	"#4dabf7",
	"#9775fa",
	"#da77f2",
	"#f783ac",
	"#69db7c",
	"#38d9a9",
	"#ffd43b",
	"#ffa94d",
	"#ff8787",
];

function pick<T>(arr: readonly T[], n: number): T {
	return arr[Math.abs(n) % arr.length]!;
}

function seed(id: string): number {
	let h = 0;
	for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i);
	return Math.abs(h);
}

function makeRect(id: string, x: number, y: number, w: number, h: number, color: string) {
	const s = seed(id);
	return {
		type: "rectangle",
		id,
		version: 1,
		versionNonce: s % 1e9,
		isDeleted: false,
		x,
		y,
		width: w,
		height: h,
		angle: 0,
		strokeColor: color,
		backgroundColor: color,
		fillStyle: "hachure",
		strokeWidth: 1,
		strokeStyle: "solid",
		roughness: 1,
		opacity: 100,
		groupIds: [],
		roundness: null,
		boundElements: null,
		updated: 1,
		seed: s,
	};
}

function makeEllipse(id: string, x: number, y: number, w: number, h: number, color: string) {
	const s = seed(id);
	return {
		type: "ellipse",
		id,
		version: 1,
		versionNonce: (s + 1) % 1e9,
		isDeleted: false,
		x,
		y,
		width: w,
		height: h,
		angle: 0,
		strokeColor: color,
		backgroundColor: color,
		fillStyle: "hachure",
		strokeWidth: 1,
		strokeStyle: "solid",
		roughness: 1,
		opacity: 100,
		groupIds: [],
		roundness: { type: 2 },
		boundElements: null,
		updated: 1,
		seed: s,
	};
}

function makeArrow(
	id: string,
	x: number,
	y: number,
	points: [number, number][],
	color: string,
	opts?: { startArrowhead?: "arrow" | null; endArrowhead?: "arrow" | null },
) {
	const s = seed(id);
	return {
		type: "arrow",
		id,
		version: 1,
		versionNonce: s % 1e9,
		isDeleted: false,
		x,
		y,
		angle: 0,
		strokeColor: color,
		backgroundColor: "transparent",
		fillStyle: "solid",
		strokeWidth: 1,
		strokeStyle: "solid",
		roughness: 1,
		opacity: 100,
		groupIds: [],
		roundness: { type: 2 },
		boundElements: null,
		updated: 1,
		seed: s,
		points,
		startArrowhead: opts?.startArrowhead ?? null,
		endArrowhead: opts?.endArrowhead ?? null,
	};
}

function makeText(
	id: string,
	x: number,
	y: number,
	text: string,
	color: string,
	fontSize = 24,
	width = 80,
) {
	const s = seed(id);
	return {
		type: "text",
		id,
		version: 1,
		versionNonce: (s + 2) % 1e9,
		isDeleted: false,
		x,
		y,
		width,
		height: Math.ceil(fontSize * 1.25),
		angle: 0,
		strokeColor: color,
		backgroundColor: "transparent",
		fillStyle: "solid",
		strokeWidth: 1,
		strokeStyle: "solid",
		roughness: 1,
		opacity: 100,
		groupIds: [],
		roundness: null,
		boundElements: null,
		updated: 1,
		seed: s,
		text,
		originalText: text,
		fontSize,
		fontFamily: 1,
		textAlign: "left",
		verticalAlign: "top",
		containerId: null,
		lineHeight: 1.25,
	};
}

/** Generate default scene: center header + subtitle, 4 shapes at axis positions, optional curved arrows. */
export function getLandingDefaultScene(roomId: string): RoomDocument {
	const s = seed(roomId);
	const elements: RoomDocument["elements"] = [];

	// Center piece: header + subtitle
	const centerLeft = 280;
	const centerTop = 200;
	const centerW = 280;
	const centerH = 90;
	const pad = 55; // gap from center bounds to decorative elements

	// Header always orange (brand), subtitle random color
	const subtitleColor = pick(COLORS, s + 1);
	elements.push(
		makeText(`header-${roomId}`, centerLeft, centerTop, "svelte-excalidraw", "#fc6241", 36, 320),
		makeText(`subtitle-${roomId}`, centerLeft + 25, centerTop + 48, "Copy the URL to share", subtitleColor, 20, 260),
	);

	// 8 axis positions around center: corners + sides (top-left, top, top-right, right, bottom-right, bottom, bottom-left, left)
	const centerRight = centerLeft + centerW;
	const centerBottom = centerTop + centerH;
	const bounds = [
		{ x: centerLeft - pad - 45, y: centerTop - pad - 35 }, // 0 top-left
		{ x: centerLeft + centerW / 2 - 22, y: centerTop - pad - 35 }, // 1 top
		{ x: centerRight + pad, y: centerTop - pad - 35 }, // 2 top-right
		{ x: centerRight + pad, y: centerTop + centerH / 2 - 22 }, // 3 right
		{ x: centerRight + pad, y: centerBottom + pad }, // 4 bottom-right
		{ x: centerLeft + centerW / 2 - 22, y: centerBottom + pad }, // 5 bottom
		{ x: centerLeft - pad - 45, y: centerBottom + pad }, // 6 bottom-left
		{ x: centerLeft - pad - 45, y: centerTop + centerH / 2 - 22 }, // 7 left
	];

	// Pick 4 of 8 positions (rotate by seed), place shapes (rect or ellipse)
	const start = s % 8;
	const indices = [start, (start + 2) % 8, (start + 4) % 8, (start + 6) % 8];
	const shapeCenters: { x: number; y: number }[] = [];
	for (let i = 0; i < 4; i++) {
		const idx = indices[i]!;
		const { x, y } = bounds[idx]!;
		const color = pick(COLORS, s + 2 + i);
		if (i % 2 === 0) {
			elements.push(makeRect(`rect-${roomId}-${i}`, x, y, 50, 50, color));
			shapeCenters.push({ x: x + 25, y: y + 25 });
		} else {
			elements.push(makeEllipse(`ellipse-${roomId}-${i}`, x, y, 45, 45, color));
			shapeCenters.push({ x: x + 22.5, y: y + 22.5 });
		}
	}

	// Center of the canvas (pivot for "outward" curve)
	const centerX = centerLeft + centerW / 2;
	const centerY = centerTop + centerH / 2;

	// Shape radii (from center to edge) for arrow start/end offset
	const shapeRadii = indices.map((_, i) => (i % 2 === 0 ? 25 : 22.5));

	// 30% chance per gap: curved arrow from shape i to shape i+1, bowed outward from center
	for (let i = 0; i < 4; i++) {
		if ((s + i * 11) % 100 >= 30) continue;
		const reverse = (s + i * 7) % 2 === 0;
		const c1 = shapeCenters[i]!;
		const c2 = shapeCenters[(i + 1) % 4]!;
		const dx = (reverse ? c1.x - c2.x : c2.x - c1.x);
		const dy = (reverse ? c1.y - c2.y : c2.y - c1.y);
		const len = Math.sqrt(dx * dx + dy * dy) || 1;
		const ux = dx / len;
		const uy = dy / len;
		const from = reverse
			? { x: c2.x + ux * shapeRadii[(i + 1) % 4]!, y: c2.y + uy * shapeRadii[(i + 1) % 4]! }
			: { x: c1.x + ux * shapeRadii[i]!, y: c1.y + uy * shapeRadii[i]! };
		const to = reverse
			? { x: c1.x - ux * shapeRadii[i]!, y: c1.y - uy * shapeRadii[i]! }
			: { x: c2.x - ux * shapeRadii[(i + 1) % 4]!, y: c2.y - uy * shapeRadii[(i + 1) % 4]! };
		const midX = (from.x + to.x) / 2;
		const midY = (from.y + to.y) / 2;
		const mdx = midX - centerX;
		const mdy = midY - centerY;
		const mlen = Math.sqrt(mdx * mdx + mdy * mdy) || 1;
		const outward = 35;
		const curveX = midX + (mdx / mlen) * outward;
		const curveY = midY + (mdy / mlen) * outward;
		const minX = Math.min(from.x, to.x, curveX);
		const minY = Math.min(from.y, to.y, curveY);
		let points: [number, number][] = [
			[from.x - minX, from.y - minY],
			[curveX - minX, curveY - minY],
			[to.x - minX, to.y - minY],
		];
		if (reverse) points = [points[2]!, points[1]!, points[0]!];
		const head = (s + i * 17) % 4; // 0=none, 1=start, 2=end, 3=both
		const arrowOpts = {
			startArrowhead: (head === 1 || head === 3 ? "arrow" : null) as "arrow" | null,
			endArrowhead: (head === 2 || head === 3 ? "arrow" : null) as "arrow" | null,
		};
		const arrowColor = pick(COLORS, s + 10 + i);
		elements.push(makeArrow(`arrow-${roomId}-${i}`, minX, minY, points, arrowColor, arrowOpts));
	}

	return { elements, files: {} };
}
