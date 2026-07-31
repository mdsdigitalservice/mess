// Cria (ou confirma) o arquivo SQLite e a tabela `tracks` antes do primeiro start.
// Útil para rodar uma vez logo após o deploy, antes de subir o server.js.
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), 'data');
const MEDIA_DIR = process.env.MEDIA_DIR
  ? path.resolve(process.env.MEDIA_DIR)
  : path.join(process.cwd(), 'public', 'media');

for (const dir of [DATA_DIR, MEDIA_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

const dbPath = path.join(DATA_DIR, 'admin.db');
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');

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

const count = db.prepare('SELECT COUNT(*) AS n FROM tracks').get().n;
db.close();

console.log(`Banco pronto em ${dbPath} (${count} faixa(s) já cadastradas).`);
console.log(`Pasta de mídia pronta em ${MEDIA_DIR}.`);
