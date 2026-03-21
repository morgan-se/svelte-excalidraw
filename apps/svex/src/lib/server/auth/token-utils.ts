/**
 * Server-only: token hashing with HMAC-SHA256 and server-side pepper.
 * Pepper: from DB (server_config) only; if missing we generate and store. No env/config.
 */
import { createHmac, randomBytes } from "node:crypto";
import { getDb } from "../storage/db.js";

const ALGORITHM = "sha256";
const MIN_PEPPER_LENGTH = 16;
const PEPPER_KEY = "token_pepper";

let cachedPepper: string | null = null;

/**
 * Resolve pepper: DB → generate and persist. Call once at startup.
 */
function resolvePepper(): string {
	if (cachedPepper) return cachedPepper;
	const db = getDb();
	const row = db.prepare("SELECT value FROM server_config WHERE key = ?").get(PEPPER_KEY) as
		| { value: string }
		| undefined;
	if (row?.value && row.value.length >= MIN_PEPPER_LENGTH) {
		cachedPepper = row.value;
		return cachedPepper;
	}
	const pepper = randomBytes(32).toString("hex");
	db.prepare("INSERT OR REPLACE INTO server_config (key, value) VALUES (?, ?)").run(PEPPER_KEY, pepper);
	cachedPepper = pepper;
	return pepper;
}

/**
 * Call at startup. Resolves pepper (DB → generate). In production, exits if pepper too short.
 */
export function validatePepperOrExit(): void {
	const pepper = resolvePepper();
	if (process.env.NODE_ENV === "production" && pepper.length < MIN_PEPPER_LENGTH) {
		process.stderr.write(
			"[svex] FATAL: token pepper in DB must be at least 16 chars. See SECURITY-LEAN-PLAN.md.\n",
		);
		process.exit(1);
	}
}

function getPepper(): string {
	if (cachedPepper) return cachedPepper;
	if (process.env.NODE_ENV !== "production") {
		return "dev-pepper-change-in-production";
	}
	return resolvePepper();
}

/**
 * Hash a raw token for storage. Caller must never log the raw token.
 */
export function hashToken(rawToken: string): string {
	const pepper = getPepper();
	return createHmac(ALGORITHM, pepper).update(rawToken, "utf8").digest("hex");
}

/**
 * Verify a raw token against a stored hash. Constant-time comparison.
 */
export function verifyToken(rawToken: string, storedHash: string): boolean {
	const computed = hashToken(rawToken);
	if (computed.length !== storedHash.length) return false;
	let diff = 0;
	for (let i = 0; i < computed.length; i++) {
		diff |= computed.charCodeAt(i) ^ storedHash.charCodeAt(i);
	}
	return diff === 0;
}
