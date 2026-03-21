import {
	getSecurityEvents,
	getSecurityCountsByRouteOutcome,
	revokeAllUpgradeTokens,
	revokeAllShareTokens,
} from "$lib/server/admin/data.js";
import { getSecurityCounters } from "$lib/server/auth/security-events.js";
import type { SecurityEvent } from "$lib/server/auth/security-events.js";

export function load() {
	return {
		events: getSecurityEvents(200),
		byRouteOutcome: getSecurityCountsByRouteOutcome(),
		counters: getSecurityCounters(),
	};
}

export const actions = {
	revokeUpgradeTokens: async () => {
		const revoked = revokeAllUpgradeTokens();
		return { success: true, revoked };
	},
	revokeShareTokens: async () => {
		const revoked = revokeAllShareTokens();
		return { success: true, revoked };
	},
};
