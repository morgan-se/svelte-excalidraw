/**
 * Server-only: safe structured logging for security events + in-memory buffer/counters for admin UI.
 * Never log raw token values or full secret URLs.
 */
export type SecurityEventType =
	| "join_token_consumed"
	| "join_token_invalid"
	| "login_claim_consumed"
	| "login_claim_invalid"
	| "upgrade_consumed"
	| "upgrade_invalid"
	| "rate_limited"
	| "command_failure"
	| "admin_session_invalidated"
	| "admin_share_revoked"
	| "admin_cleanup"
	| "admin_revoke_upgrade_tokens"
	| "admin_revoke_share_tokens"
	| "admin_bootstrap_link";

export interface SecurityEvent {
	type: SecurityEventType;
	route?: string;
	outcome: "success" | "failure" | "rate_limited";
	timestamp: number;
	/** e.g. redacted IP (last octet zeroed) or "unknown" */
	identity?: string;
}

const MAX_RECENT_EVENTS = 500;
const recentEvents: SecurityEvent[] = [];
const counters: Record<SecurityEventType, number> = {
	join_token_consumed: 0,
	join_token_invalid: 0,
	login_claim_consumed: 0,
	login_claim_invalid: 0,
	upgrade_consumed: 0,
	upgrade_invalid: 0,
	rate_limited: 0,
	command_failure: 0,
	admin_session_invalidated: 0,
	admin_share_revoked: 0,
	admin_cleanup: 0,
	admin_revoke_upgrade_tokens: 0,
	admin_revoke_share_tokens: 0,
	admin_bootstrap_link: 0,
};

function redactIp(ip: string): string {
	if (!ip || ip === "unknown") return "unknown";
	if (ip.includes(".")) {
		const parts = ip.split(".");
		if (parts.length === 4) parts[3] = "0";
		return parts.join(".");
	}
	if (ip.includes(":")) {
		const parts = ip.split(":");
		if (parts.length >= 4) return parts.slice(0, 4).join(":") + "::0";
		return "::";
	}
	return "unknown";
}

export function logSecurityEvent(
	event: Omit<SecurityEvent, "timestamp">,
	clientAddress?: string,
): void {
	const payload: SecurityEvent = {
		...event,
		timestamp: Date.now(),
		identity: clientAddress ? redactIp(clientAddress) : undefined,
	};
	const line = `[svex-security] ${JSON.stringify(payload)}\n`;
	process.stderr.write(line);
	// Buffer for admin UI (redacted only)
	recentEvents.push(payload);
	if (recentEvents.length > MAX_RECENT_EVENTS) recentEvents.shift();
	counters[payload.type] = (counters[payload.type] ?? 0) + 1;
}

/** Last N security events (admin only). */
export function getRecentSecurityEvents(limit = 200): SecurityEvent[] {
	return recentEvents.slice(-limit).reverse();
}

/** Counts by event type since process start (admin only). */
export function getSecurityCounters(): Record<SecurityEventType, number> {
	return { ...counters };
}
