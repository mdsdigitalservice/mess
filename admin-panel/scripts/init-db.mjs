// Cria (ou confirma) a tabela `tracks` no banco Turso.
// Uso: npm run init-db (já roda com --env-file=.env, ver package.json)
import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('TURSO_DATABASE_URL / TURSO_AUTH_TOKEN não configurados no .env.');
  process.exit(1);
}

const client = createClient({ url, authToken });

await client.execute(`
  CREATE TABLE IF NOT EXISTS tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    src TEXT NOT NULL,
    category TEXT NOT NULL,
    bpm INTEGER,
    duration TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
await client.execute('CREATE INDEX IF NOT EXISTS idx_tracks_category ON tracks(category)');
await client.execute('CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON tracks(created_at DESC)');

const count = await client.execute('SELECT COUNT(*) AS n FROM tracks');

console.log(`Banco Turso pronto (${count.rows[0].n} faixa(s) já cadastradas).`);
