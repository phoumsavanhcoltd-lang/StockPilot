import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultPath = fileURLToPath(new URL('./data/stockpilot.db', import.meta.url));
const dbPath = process.env.DB_PATH || defaultPath;
if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS analyses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    file_name   TEXT,
    provider    TEXT NOT NULL,
    model       TEXT,
    title       TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    keywords    TEXT NOT NULL DEFAULT '[]',
    category    TEXT NOT NULL DEFAULT '',
    score       INTEGER,
    warnings    TEXT NOT NULL DEFAULT '[]',
    filled_at   TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_analyses_created ON analyses(created_at DESC);
`);

const parse = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };
const toRow = r => r && ({
  id: r.id, createdAt: r.created_at, updatedAt: r.updated_at, fileName: r.file_name,
  provider: r.provider, model: r.model, title: r.title, description: r.description,
  keywords: parse(r.keywords, []), category: r.category, score: r.score,
  warnings: parse(r.warnings, []), filledAt: r.filled_at
});

const insert = db.prepare(`INSERT INTO analyses (file_name, provider, model, title, description, keywords, category, score, warnings)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const getStmt = db.prepare('SELECT * FROM analyses WHERE id = ?');
const listStmt = db.prepare('SELECT * FROM analyses ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?');
const updateStmt = db.prepare(`UPDATE analyses SET title = ?, description = ?, keywords = ?, category = ?,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`);
const filledStmt = db.prepare("UPDATE analyses SET filled_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");
const deleteStmt = db.prepare('DELETE FROM analyses WHERE id = ?');

export function saveAnalysis({ fileName, provider, model, metadata }) {
  const q = metadata.quality || {};
  const { lastInsertRowid } = insert.run(
    fileName ? String(fileName).slice(0, 255) : null, provider, model || null,
    metadata.title, metadata.description, JSON.stringify(metadata.keywords),
    metadata.category, q.score ?? null, JSON.stringify(q.warnings || [])
  );
  return toRow(getStmt.get(lastInsertRowid));
}
export const getAnalysis = id => toRow(getStmt.get(id));
export const listAnalyses = (limit = 20, offset = 0) => listStmt.all(limit, offset).map(toRow);
export function updateAnalysis(id, { title, description, keywords, category }) {
  const cur = getStmt.get(id);
  if (!cur) return null;
  updateStmt.run(
    title ?? cur.title, description ?? cur.description,
    keywords ? JSON.stringify(keywords) : cur.keywords, category ?? cur.category, id
  );
  return toRow(getStmt.get(id));
}
export const markFilled = id => filledStmt.run(id).changes > 0;
export const deleteAnalysis = id => deleteStmt.run(id).changes > 0;
