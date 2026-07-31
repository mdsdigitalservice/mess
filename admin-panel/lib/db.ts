import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { DATA_DIR } from './paths';
import type { Track } from './types';

export type { Track };

// node:sqlite (built-in desde o Node 22.5, sem flag a partir do Node 23) em vez
// de better-sqlite3: zero módulo nativo para compilar no deploy. Isso importa
// de verdade aqui — a VPS cPanel não tem garantia de toolchain de build
// (python/gcc) disponível, e é exatamente o tipo de ambiente onde node-gyp falha.
declare global {
  // eslint-disable-next-line no-var
  var __messDb: DatabaseSync | undefined;
}

const DB_PATH = path.join(DATA_DIR, 'admin.db');

// Reaproveita a conexão entre hot-reloads do dev server (Next recarrega módulos
// a cada request em dev) — sem isso, cada reload abriria um novo handle do arquivo.
const db = global.__messDb ?? new DatabaseSync(DB_PATH);
global.__messDb = db;

// WAL: leituras do dashboard não bloqueiam a escrita de um upload em andamento.
db.exec('PRAGMA busy_timeout = 5000');
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    src TEXT NOT NULL,
    category TEXT NOT NULL,
    bpm INTEGER,
    duration TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_tracks_category ON tracks(category);
  CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON tracks(created_at DESC);
`);

export default db;
