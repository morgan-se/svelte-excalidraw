/**
 * Server-only: simple in-memory rate limiting for sensitive token-consuming endpoints.
 * Security is not optional: rate limits are always on with static defaults (no env/config).
 */
const buckets = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 60 * 1000; // 1 minute
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 min

const RATE_LIMIT_JOIN_PER_MIN = 30;
const RATE_LIMIT_LOGIN_CLAIM_PER_MIN = 10;
const RATE_LIMIT_UPGRADE_PER_MIN = 10;

function cleanup(): void {
	const now = Date.now();
	for (const [key, data] of buckets.entries()) {
		if (now - data.windowStart > WINDOW_MS) buckets.delete(key);
	}
}
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
function scheduleCleanup(): void {
	if (cleanupTimer) return;
	cleanupTimer = setInterval(cleanup, CLEANUP_INTERVAL_MS);
	if (cleanupTimer.unref) cleanupTimer.unref();
}

/**
 * Check rate limit for identifier. Returns true if allowed, false if rate limited.
 */
export function checkRateLimit(
	identifier: string,
	limit: number,
	windowMs: number = WINDOW_MS,
): boolean {
	scheduleCleanup();
	const now = Date.now();
	const entry = buckets.get(identifier);
	if (!entry) {
		buckets.set(identifier, { count: 1, windowStart: now });
		return true;
	}
	if (now - entry.windowStart >= windowMs) {
		entry.count = 1;
		entry.windowStart = now;
		return true;
	}
	entry.count += 1;
	return entry.count <= limit;
}

/** Limit for /join/[token] per IP per minute. */
export function getJoinLimit(): number {
	return RATE_LIMIT_JOIN_PER_MIN;
}

/** Limit for /login/claim/[token] per IP per minute. */
export function getLoginClaimLimit(): number {
	return RATE_LIMIT_LOGIN_CLAIM_PER_MIN;
}

/** Limit for /upgrade (consume code) per IP per minute. */
export function getUpgradeLimit(): number {
	return RATE_LIMIT_UPGRADE_PER_MIN;
}

/** Rate limiting is always on; security cannot be disabled. */
export function isRateLimitEnabledForSensitiveRoutes(): boolean {
	return true;
}
