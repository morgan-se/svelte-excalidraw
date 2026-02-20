const CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

/** Generate a 6-character room code (no ambiguous chars). */
export function generateRoomCode(): string {
	let s = "";
	const arr = new Uint8Array(6);
	if (typeof crypto !== "undefined" && crypto.getRandomValues) {
		crypto.getRandomValues(arr);
		for (let i = 0; i < 6; i++) s += CHARS[arr[i]! % CHARS.length];
	} else {
		for (let i = 0; i < 6; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
	}
	return s;
}

export function normalizeRoomCode(input: string): string {
	return input
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "")
		.slice(0, 6);
}

export function isValidRoomCode(code: string): boolean {
	return /^[a-z0-9]{1,6}$/.test(code);
}
