// Importa os sets do sets.json (site atual) para o SQLite do painel.
// Uso: node scripts/migrar-dados.mjs [caminho-para-sets.json]
// Padrão: ../rogerio-mess-dj/data/sets.json (relativo à raiz deste projeto).
//
// Idempotente: rodar de novo não duplica faixas já importadas (pula por src,
// ou por título+categoria nas 3 faixas que ainda não têm áudio real).
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DEFAULT_JSON_PATH = path.join(process.cwd(), '..', 'rogerio-mess-dj', 'data', 'sets.json');
const jsonPath = path.resolve(process.argv[2] || DEFAULT_JSON_PATH);

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), 'data');
const dbPath = path.join(DATA_DIR, 'admin.db');

const ALLOWED_CATEGORIES = new Set(['house', 'flashback', 'sertanejo']);

if (!fs.existsSync(jsonPath)) {
  console.error(`Arquivo não encontrado: ${jsonPath}`);
  process.exit(1);
}
if (!fs.existsSync(dbPath)) {
  console.error(`Banco não encontrado em ${dbPath}. Rode "npm run init-db" primeiro.`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const sections = Array.isArray(raw.sections) ? raw.sections : [];

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');

const findBySrc = db.prepare('SELECT id FROM tracks WHERE src = ?');
const findByTitleCategory = db.prepare('SELECT id FROM tracks WHERE title = ? AND category = ?');
const insert = db.prepare('INSERT INTO tracks (title, src, category, bpm, duration) VALUES (?, ?, ?, ?, ?)');

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

    const alreadyExists = src ? findBySrc.get(src) : findByTitleCategory.get(title, category);
    if (alreadyExists) {
      skipped++;
      continue;
    }

    insert.run(title, src, category, bpm, duration);
    inserted++;
  }
}

db.close();

console.log('\nMigração concluída.');
console.log(`  Inseridas: ${inserted}`);
console.log(`  Puladas (já existiam ou sem título): ${skipped}`);
if (ignoredCategory) console.log(`  Ignoradas por categoria desconhecida: ${ignoredCategory}`);
console.log(`\nBanco: ${dbPath}`);
