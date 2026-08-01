import { createClient, type Client } from '@libsql/client';
import type { Track } from './types';

export type { Track };

// Turso (libSQL sobre HTTP) em vez de node:sqlite: a Vercel roda funções
// serverless com disco efêmero/somente-leitura — um arquivo SQLite local
// não sobrevive entre requests. Turso fala o mesmo dialeto SQL, mas guarda
// os dados remotamente, então funciona nesse tipo de hospedagem.
declare global {
  // eslint-disable-next-line no-var
  var __messTurso: Client | undefined;
  // eslint-disable-next-line no-var
  var __messSchemaReady: Promise<void> | undefined;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente ${name} não configurada.`);
  }
  return value;
}

function getClient(): Client {
  if (!global.__messTurso) {
    global.__messTurso = createClient({
      url: requiredEnv('TURSO_DATABASE_URL'),
      authToken: requiredEnv('TURSO_AUTH_TOKEN'),
    });
  }
  return global.__messTurso;
}

async function ensureSchema(client: Client): Promise<void> {
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
}

// Memoiza a checagem/criação do schema entre invocações do mesmo processo —
// evita rodar 3x "CREATE TABLE IF NOT EXISTS" a cada request.
export async function getDb(): Promise<Client> {
  const client = getClient();
  if (!global.__messSchemaReady) {
    global.__messSchemaReady = ensureSchema(client);
  }
  await global.__messSchemaReady;
  return client;
}
