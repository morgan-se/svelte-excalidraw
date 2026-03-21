<script lang="ts">
	import { browser } from "$app/environment";
	import { getClientState, setProfile, clearProfile } from "$lib/client/client-state.js";
	import { CollaboratorProfile, COLLABORATOR_COLORS } from "svelte-excalidraw";
	import type { CollaboratorColorHex } from "svelte-excalidraw";
	import { getFingerprint } from "$lib/client/fingerprint.js";
	import {
		sessionUpdateProfile,
		createLoginLink,
		upgradeWithCode,
		createUpgradeCodeRemote,
	} from "$lib/svex.remote.js";
	import { getRandomUsername } from "@excalidraw/random-username";
	import type { SessionData } from "$lib/core/types/session-types.js";
	import type { ConfigFlags } from "$lib/config.js";

	let {
		session = undefined as SessionData | undefined,
		showSessionMenu = false,
		showLabel = false,
		flags = undefined as ConfigFlags | undefined,
	} = $props();

	const widgetId = crypto.randomUUID();
	let username = $state("");
	let color = $state<CollaboratorColorHex>(COLLABORATOR_COLORS[0]!);
	let sessionMenuOpen = $state(false);
	let loginLinkCopied = $state(false);
	let loginLinkError = $state("");
	let upgradeCodeCopiedFor = $state<"trusted" | "admin" | null>(null);

	const userKind = $derived(session?.userKind ?? "guest");
	const canUpgrade = $derived(userKind !== "admin");
	const canCreateUpgradeCode = $derived(userKind === "trusted" || userKind === "admin");

	async function syncProfileToSession() {
		if (!browser) return;
		const fingerprint = await getFingerprint().catch(() => undefined);
		sessionUpdateProfile({
			username: username || undefined,
			color: color || undefined,
			fingerprint,
		});
	}

	function initFromStorage() {
		if (!browser) return;
		const state = getClientState();
		const name = state.username?.trim();
		const hex = state.color;
		if (name && hex && (COLLABORATOR_COLORS as readonly string[]).includes(hex)) {
			username = name;
			color = hex;
		} else if (session?.username?.trim() || session?.color) {
			username = session.username?.trim() ?? "";
			color = (session.color && (COLLABORATOR_COLORS as readonly string[]).includes(session.color)) ? session.color : COLLABORATOR_COLORS[0]!;
			setProfile({ username: username || undefined, color });
		} else {
			username = getRandomUsername();
			const pick = COLLABORATOR_COLORS[Math.floor(Math.random() * COLLABORATOR_COLORS.length)]!;
			color = pick;
			setProfile({ username, color: pick });
		}
		syncProfileToSession();
	}

	$effect(() => {
		if (!browser || !session) return;
		const state = getClientState();
		if (state.username?.trim() || state.color) return;
		if (session.username?.trim() || session.color) {
			username = session.username?.trim() ?? "";
			color = (session.color && (COLLABORATOR_COLORS as readonly string[]).includes(session.color)) ? session.color : COLLABORATOR_COLORS[0]!;
			setProfile({ username: username || undefined, color });
			syncProfileToSession();
		}
	});

	initFromStorage();

	$effect(() => {
		if (!browser) return;
		setProfile({ username: username || undefined, color: color || undefined });
		syncProfileToSession();
	});

	async function copyProfileLink() {
		loginLinkError = "";
		loginLinkCopied = false;
		sessionMenuOpen = false;
		const out = await createLoginLink(undefined);
		if (out && "error" in out) {
			loginLinkError = out.error ?? "Failed";
			return;
		}
		if (out && "url" in out) {
			try {
				await navigator.clipboard.writeText(out.url);
				loginLinkCopied = true;
				setTimeout(() => (loginLinkCopied = false), 2500);
			} catch {
				loginLinkError = "Could not copy";
			}
		}
	}

	function logout() {
		sessionMenuOpen = false;
		clearProfile();
		window.location.href = "/logout";
	}

	async function doUpgrade() {
		sessionMenuOpen = false;
		const input = prompt("Enter upgrade code or paste upgrade link:");
		if (!input?.trim()) return;
		const raw = input.trim();
		const urlMatch = raw.match(/\/upgrade\/([a-zA-Z0-9-]+)/);
		const code = urlMatch ? urlMatch[1]! : raw.split(/[?#]/)[0]?.trim() ?? raw;
		const out = await upgradeWithCode(code);
		if (out && "ok" in out && out.ok) {
			window.location.href = out.targetUserKind === "admin" ? "/account/security" : "/";
		} else if (out && "error" in out) loginLinkError = out.error ?? "Failed";
	}

	async function doCreateUpgradeCode(target: "trusted" | "admin") {
		const out = await createUpgradeCodeRemote(target);
		if (out && "error" in out) {
			loginLinkError = out.error ?? "Failed";
			return;
		}
		if (out && "code" in out) {
			const url = `${typeof window !== "undefined" ? window.location.origin : ""}/upgrade/${out.code}`;
			try {
				await navigator.clipboard.writeText(url);
				loginLinkError = "";
				upgradeCodeCopiedFor = target;
				setTimeout(() => {
					upgradeCodeCopiedFor = null;
					sessionMenuOpen = false;
				}, 2000);
			} catch {
				loginLinkError = "Could not copy";
			}
		}
	}

	$effect(() => {
		if (!browser) return;
		const popover = document.getElementById(`profile-session-menu-${widgetId}`) as HTMLDivElement & { showPopover?: () => void; hidePopover?: () => void };
		if (sessionMenuOpen) {
			popover?.showPopover?.();
			const onOutside = (e: MouseEvent) => {
				const target = e.target as Node;
				if (popover && !popover.contains(target) && !(e.target as Element).closest?.(".profile-session-wrap")) {
					sessionMenuOpen = false;
					document.removeEventListener("click", onOutside);
				}
			};
			setTimeout(() => document.addEventListener("click", onOutside), 0);
			return () => document.removeEventListener("click", onOutside);
		} else {
			popover?.hidePopover?.();
		}
	});
</script>

<div class="profile-widget">
	<CollaboratorProfile
		bind:username
		bind:color
		placeholder={showLabel ? "" : "Your name"}
		label={showLabel ? "Name:" : ""}
	/>
	{#if userKind === "trusted"}
		<span class="profile-badge" title="Trusted">⭐</span>
	{:else if userKind === "admin"}
		<span class="profile-badge profile-badge-admin" title="Admin">★</span>
	{/if}
	{#if showSessionMenu}
		<div class="profile-session-wrap" style="anchor-name: --profile-session-{widgetId};">
			<button
				type="button"
				class="profile-session-trigger"
				class:open={sessionMenuOpen}
				onclick={() => (sessionMenuOpen = !sessionMenuOpen)}
				aria-label="Session options"
				aria-haspopup="menu"
				aria-expanded={sessionMenuOpen}
			>
				⋮
			</button>
			<div
				id="profile-session-menu-{widgetId}"
				popover="manual"
				class="profile-session-menu"
				style="position-anchor: --profile-session-{widgetId};"
				role="menu"
				tabindex="-1"
			>
				<button type="button" role="menuitem" onclick={copyProfileLink}>
					{loginLinkCopied ? "Copied!" : "Copy 🔑 login link"}
				</button>
				{#if canUpgrade}
					<button type="button" role="menuitem" onclick={doUpgrade}>
						Upgrade
					</button>
				{/if}
				{#if canCreateUpgradeCode}
					<button type="button" role="menuitem" onclick={() => doCreateUpgradeCode("trusted")}>
						{upgradeCodeCopiedFor === "trusted" ? "Copied!" : "Create trusted code"}
					</button>
					{#if userKind === "admin"}
						<button type="button" role="menuitem" onclick={() => doCreateUpgradeCode("admin")}>
							{upgradeCodeCopiedFor === "admin" ? "Copied!" : "Create admin code"}
						</button>
						<a href="/admin" role="menuitem">Admin</a>
					{/if}
				{/if}
				<a href="/account" role="menuitem">Account</a>
				<button type="button" role="menuitem" class="profile-session-logout" onclick={logout}>Logout / new session</button>
			</div>
		</div>
	{/if}
</div>
{#if loginLinkError}
	<p class="profile-login-error">{loginLinkError}</p>
{/if}

<style>
	.profile-widget {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.profile-badge {
		font-size: 1rem;
		line-height: 1;
		opacity: 0.9;
	}
	.profile-badge-admin {
		color: var(--accent, #fc6241);
	}
	.profile-session-wrap {
		position: relative;
	}
	.profile-session-trigger {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2px;
		border-radius: 4px;
		border: 2px solid transparent;
		background: transparent;
		cursor: pointer;
		transition: border-color 0.15s;
	}
	.profile-session-trigger:hover {
		border-color: var(--muted, #a1a1aa);
	}
	.profile-session-trigger.open {
		border-color: var(--accent, #fc6241);
	}
	.profile-session-trigger {
		font-size: 1rem;
		line-height: 1;
		color: var(--muted, #a1a1aa);
		min-width: 1.5rem;
		min-height: 1.5rem;
	}
	.profile-session-trigger:hover {
		color: var(--text, #e4e4e7);
	}
	.profile-session-menu {
		display: none;
		/* Popover is in top layer: must set theme explicitly (no inheritance) */
		background: var(--bg, #0f0f12);
		color: var(--text, #e4e4e7);
		font-family: var(--font-sans, ui-sans-serif, system-ui, sans-serif);
		border: 1px solid var(--border, #27272a);
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
		overflow: hidden;
	}
	.profile-session-menu:popover-open {
		display: flex;
		flex-direction: column;
		min-width: 12rem;
	}
	@supports (position-anchor: --profile-session) {
		.profile-session-menu:popover-open {
			position: absolute;
			position-area: block-end;
			margin-top: 0.25rem;
		}
	}
	.profile-session-menu :global(button),
	.profile-session-menu :global(a) {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.5rem 0.75rem;
		font-size: 0.9rem;
		background: transparent;
		border: none;
		color: var(--text, #e4e4e7);
		cursor: pointer;
		text-decoration: none;
		font-family: inherit;
		transition: background 0.15s ease;
	}
	.profile-session-menu :global(button:hover),
	.profile-session-menu :global(a:hover) {
		background: var(--border, #27272a);
	}
	.profile-session-menu :global(a) {
		color: var(--text, #e4e4e7);
	}
	.profile-session-logout:hover {
		background: rgba(197, 48, 48, 0.25);
		color: #f87171;
	}
	.profile-login-error {
		font-size: 0.85rem;
		color: var(--accent);
		margin: 0.25rem 0 0 0;
	}
</style>
