/** Client-only: device fingerprint via FingerprintJS. */
let cached: string | null = null;

export async function getFingerprint(): Promise<string> {
	if (cached) return cached;
	const { load } = await import("@fingerprintjs/fingerprintjs");
	const fp = await load();
	const result = await fp.get();
	cached = result.visitorId;
	return cached;
}
