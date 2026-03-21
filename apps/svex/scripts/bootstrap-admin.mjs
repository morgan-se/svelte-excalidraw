#!/usr/bin/env node
/**
 * Generate a single-use, short-TTL admin upgrade URL. Print once to stdout.
 * Use from Docker: docker compose exec svex npm run svex:bootstrap-admin
 * No app log leakage; OP retrieves the URL from this terminal only.
 */
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";

const DATA_DIR = process.env.SVEX_DATA_DIR || join(process.cwd(), "data");
const DB_PATH = join(DATA_DIR, "db.sqlite");
const PEPPER_KEY = "token_pepper";
const BOOTSTRAP_TTL_MS = 10 * 60 * 1000; // 10 min

function ensureDataDir() {
	if (!existsSync(DATA_DIR)) {
		mkdirSync(DATA_DIR, { recursive: true });
	}
}

function hashToken(pepper, rawToken) {
	return createHmac("sha256", pepper).update(rawToken, "utf8").digest("hex");
}

function getOrCreatePepper(db) {
	let row = db.prepare("SELECT value FROM server_config WHERE key = ?").get(PEPPER_KEY);
	if (row?.value && row.value.length >= 16) {
		return row.value;
	}
	const pepper = randomBytes(32).toString("hex");
	db.prepare("INSERT OR REPLACE INTO server_config (key, value) VALUES (?, ?)").run(PEPPER_KEY, pepper);
	return pepper;
}

ensureDataDir();
const db = new Database(DB_PATH);

// Ensure tables exist (idempotent; app may have already created them)
db.exec(`
  CREATE TABLE IF NOT EXISTS server_config (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS upgrade_tokens (
    token TEXT PRIMARY KEY,
    target_user_kind TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT 0
  );
`);

// Always generate a new short-TTL admin link (supports N admins; each run = one new link).
const pepper = getOrCreatePepper(db);
const rawCode = randomUUID();
const stored = hashToken(pepper, rawCode);
const now = Date.now();
const expiresAt = now + BOOTSTRAP_TTL_MS;

db.prepare(
	"INSERT INTO upgrade_tokens (token, target_user_kind, expires_at, created_at) VALUES (?, ?, ?, ?)",
).run(stored, "admin", expiresAt, now);

db.close();

const origin = process.env.SVEX_ORIGIN || process.env.APP_URL || "http://localhost:5173";
const url = `${origin}/upgrade/${rawCode}`;
process.stdout.write(`${url}\n`);
