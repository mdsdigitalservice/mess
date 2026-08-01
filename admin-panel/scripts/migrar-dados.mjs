// Importa os sets do sets.json (site atual) para o banco Turso do painel.
// Uso: npm run migrar-dados -- [caminho-para-sets.json]
// Padrão: ../rogerio-mess-dj/data/sets.json (relativo à raiz deste projeto).
//
// Idempotente: rodar de novo não duplica faixas já importadas (pula por src,
// ou por título+categoria nas faixas que ainda não têm áudio real).
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@libsql/client';

const DEFAULT_JSON_PATH = path.join(process.cwd(), '..', 'rogerio-mess-dj', 'data', 'sets.json');
const jsonPath = path.resolve(process.argv[2] || DEFAULT_JSON_PATH);

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  console.error('TURSO_DATABASE_URL / TURSO_AUTH_TOKEN não configurados no .env.');
  process.exit(1);
}

const ALLOWED_CATEGORIES = new Set(['house', 'flashback', 'sertanejo']);

if (!fs.existsSync(jsonPath)) {
  console.error(`Arquivo não encontrado: ${jsonPath}`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const sections = Array.isArray(raw.sections) ? raw.sections : [];

const client = createClient({ url, authToken });

let inserted = 0;
let skipped = 0;
let ignoredCategory = 0;

for (const section of sections) {
  const category = section.id;
  if (!ALLOWED_CATEGORIES.has(category)) {
    console.warn(`Seção "${section.label ?? category}" ignorada — categoria "${category}" não reconhecida.`);
    ignoredCategory += (section.tracks || []).length;
    continue;
  }

  for (const track of section.tracks || []) {
    const title = (track.title || '').trim();
    const src = (track.src || '').trim();
    const bpm = Number.isInteger(track.bpm) ? track.bpm : null;
    const duration = (track.dur || '').trim() || null;

    if (!title) {
      console.warn('Faixa sem título ignorada:', track.id ?? '(sem id)');
      skipped++;
      continue;
    }

    const existing = src
      ? await client.execute({ sql: 'SELECT id FROM tracks WHERE src = ?', args: [src] })
      : await client.execute({ sql: 'SELECT id FROM tracks WHERE title = ? AND category = ?', args: [title, category] });

    if (existing.rows.length > 0) {
      skipped++;
      continue;
    }

    await client.execute({
      sql: 'INSERT INTO tracks (title, src, category, bpm, duration) VALUES (?, ?, ?, ?, ?)',
      args: [title, src, category, bpm, duration],
    });
    inserted++;
  }
}

console.log('\nMigração concluída.');
console.log(`  Inseridas: ${inserted}`);
console.log(`  Puladas (já existiam ou sem título): ${skipped}`);
if (ignoredCategory) console.log(`  Ignoradas por categoria desconhecida: ${ignoredCategory}`);
