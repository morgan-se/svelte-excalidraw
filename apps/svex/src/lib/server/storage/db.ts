/**
 * Server-only: SQLite DB for workspaces, collections, whiteboards, sessions, tokens.
 * Single DB at DATA_DIR/db.sqlite. Schema + optional migrations (e.g. add created_at if missing).
 */
import Database from "better-sqlite3";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR } from "./data-dir.js";

const DB_PATH = join(DATA_DIR, "db.sqlite");

let db: Database.Database | null = null;

function ensureDataDir(): void {
	if (!existsSync(DATA_DIR)) {
		mkdirSync(DATA_DIR, { recursive: true });
	}
}

function runMigrations(database: Database.Database): void {
	const now = Date.now();
	try {
		database.prepare(`ALTER TABLE share_tokens ADD COLUMN created_at INTEGER NOT NULL DEFAULT ${now}`).run();
	} catch (e) {
		if (e instanceof Error && !e.message.includes("duplicate column name")) throw e;
	}
	try {
		database.prepare(`ALTER TABLE upgrade_tokens ADD COLUMN created_at INTEGER NOT NULL DEFAULT ${now}`).run();
	} catch (e) {
		if (e instanceof Error && !e.message.includes("duplicate column name")) throw e;
	}
	try {
		database.prepare("ALTER TABLE workspaces ADD COLUMN share_links_disabled INTEGER NOT NULL DEFAULT 0").run();
	} catch (e) {
		if (e instanceof Error && !e.message.includes("duplicate column name")) throw e;
	}
	// Identity layer: accounts + session_account (no-op if tables exist)
	try {
		database.exec(`
			CREATE TABLE IF NOT EXISTS accounts (
				id TEXT PRIMARY KEY,
				username TEXT NOT NULL UNIQUE,
				password_hash TEXT NOT NULL,
				role TEXT NOT NULL CHECK(role IN ('trusted', 'admin')),
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL
			);
			CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_username ON accounts(username);
			CREATE TABLE IF NOT EXISTS session_account (
				session_id TEXT NOT NULL PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
				account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
				bound_at INTEGER NOT NULL
			);
			CREATE INDEX IF NOT EXISTS idx_session_account_account ON session_account(account_id);
		`);
	} catch (e) {
		if (e instanceof Error && !e.message.includes("already exists")) throw e;
	}
}

function initDb(): Database.Database {
	if (db) return db;
	ensureDataDir();
	db = new Database(DB_PATH);
	db.pragma("journal_mode = WAL");
	db.exec(SCHEMA);
	runMigrations(db);
	return db;
}

const SCHEMA = `
-- Workspaces: backend persistent OR local workdir
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  is_remote INTEGER NOT NULL DEFAULT 0,
  name TEXT,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  viewed_at INTEGER NOT NULL,
  share_links_disabled INTEGER NOT NULL DEFAULT 0
);

-- Collections: belong to workspace
CREATE TABLE IF NOT EXISTS collections (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  viewed_at INTEGER NOT NULL,
  PRIMARY KEY (workspace_id, slug)
);

-- Whiteboards: belong to workspace, or standalone (ephemeral)
CREATE TABLE IF NOT EXISTS whiteboards (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  collection TEXT,
  doc_id TEXT NOT NULL,
  name TEXT,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  viewed_at INTEGER NOT NULL,
  host_user_id TEXT,
  FOREIGN KEY (workspace_id, collection) REFERENCES collections(workspace_id, slug)
);

-- Sessions (replaces data/sessions/*.json)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_kind TEXT NOT NULL DEFAULT 'guest',
  username TEXT,
  color TEXT,
  created_at INTEGER,
  last_presence_at INTEGER,
  login_token TEXT UNIQUE,
  ip TEXT,
  user_agent TEXT,
  accept_language TEXT,
  fingerprint TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_ip ON sessions(ip);

-- Session grants: workspace-level OR whiteboard-level (ephemeral = whiteboard with workspace_id NULL)
CREATE TABLE IF NOT EXISTS session_grants (
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  whiteboard_id TEXT REFERENCES whiteboards(id) ON DELETE CASCADE,
  access TEXT NOT NULL CHECK(access IN ('read', 'readWrite')),
  added_at INTEGER NOT NULL,
  last_updated_at INTEGER,
  CHECK (
    (workspace_id IS NOT NULL AND whiteboard_id IS NULL) OR
    (workspace_id IS NULL AND whiteboard_id IS NOT NULL)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_grants_workspace ON session_grants(session_id, workspace_id) WHERE workspace_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_grants_whiteboard ON session_grants(session_id, whiteboard_id) WHERE whiteboard_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_session_grants_session ON session_grants(session_id);

-- Share tokens. Token column stores HMAC-SHA256 hash only. One-time use.
CREATE TABLE IF NOT EXISTS share_tokens (
  token TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  workspace_id TEXT,
  room_id TEXT NOT NULL,
  access TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT 0
);

-- Upgrade tokens. Token column stores HMAC-SHA256 hash only. One-time use.
CREATE TABLE IF NOT EXISTS upgrade_tokens (
  token TEXT PRIMARY KEY,
  target_user_kind TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_whiteboards_workspace ON whiteboards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_whiteboards_updated ON whiteboards(updated_at);
CREATE INDEX IF NOT EXISTS idx_workspaces_remote ON workspaces(is_remote);
CREATE INDEX IF NOT EXISTS idx_share_tokens_expires ON share_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_upgrade_tokens_expires ON upgrade_tokens(expires_at);

-- Server config (e.g. token pepper). Operator can omit pepper in config; we store it here.
CREATE TABLE IF NOT EXISTS server_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Identity layer (Section 9): accounts for trusted/admin, optional password.
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('trusted', 'admin')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_username ON accounts(username);

-- Session–account binding (one session → one account; one account → many sessions).
CREATE TABLE IF NOT EXISTS session_account (
  session_id TEXT NOT NULL PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  bound_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_account_account ON session_account(account_id);
`;

export function getDb(): Database.Database {
	return initDb();
}

/** True if share links are disabled for this workspace (revoke policy). */
export function isShareLinksDisabled(workspaceId: string): boolean {
	const row = getDb()
		.prepare("SELECT share_links_disabled FROM workspaces WHERE id = ?")
		.get(workspaceId) as { share_links_disabled: number } | undefined;
	return row?.share_links_disabled === 1;
}

/** Set share-links-disabled policy for a workspace. Does not revoke existing tokens (caller may revoke). */
export function setShareLinksDisabled(workspaceId: string, disabled: boolean): void {
	getDb().prepare("UPDATE workspaces SET share_links_disabled = ? WHERE id = ?").run(disabled ? 1 : 0, workspaceId);
}
