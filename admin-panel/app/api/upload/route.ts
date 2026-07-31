import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';
import { MEDIA_DIR } from '@/lib/paths';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

// Os sets ao vivo já migrados chegam a ~170MB (ver histórico de migração do WordPress).
const MAX_FILE_BYTES = 250 * 1024 * 1024;

// form.get() de um campo ausente retorna null (não undefined) — normaliza
// antes de validar, ou z.string().optional() rejeita o null como tipo errado.
const nullToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === null ? undefined : v), schema.optional());

const MetaSchema = z.object({
  title: z.string().trim().min(1).max(200),
  category: z.enum(['house', 'flashback', 'sertanejo']),
  bpm: nullToUndefined(z.string())
    .transform((v) => (v && v.trim() !== '' ? Number(v) : undefined))
    .refine((v) => v === undefined || (Number.isInteger(v) && v >= 0 && v <= 300), 'BPM inválido'),
  duration: nullToUndefined(z.string().trim().max(20)),
});

// Nunca confiar na extensão/nome enviado pelo cliente para decidir se é MP3 —
// checa os bytes reais do arquivo (ID3v2 tag ou frame sync do MPEG).
function looksLikeMp3(buf: Buffer): boolean {
  if (buf.length < 4) return false;
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return true; // "ID3"
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return true; // MPEG frame sync (11 bits em 1)
  return false;
}

function slugify(input: string): string {
  const base = input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || 'faixa';
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`upload:${ip}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Limite de uploads por hora atingido.' }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Formulário inválido.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Arquivo MP3 ausente.' }, { status: 400 });
  }

  if (file.size === 0 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `O arquivo deve ter entre 1 byte e ${Math.floor(MAX_FILE_BYTES / 1024 / 1024)}MB.` },
      { status: 400 }
    );
  }

  const clientExt = path.extname(file.name).toLowerCase();
  if (clientExt !== '.mp3') {
    return NextResponse.json({ error: 'Somente arquivos .mp3 são aceitos.' }, { status: 400 });
  }
  if (file.type && !['audio/mpeg', 'audio/mp3'].includes(file.type)) {
    return NextResponse.json({ error: 'Tipo de arquivo inválido.' }, { status: 400 });
  }

  const parsed = MetaSchema.safeParse({
    title: form.get('title'),
    category: form.get('category'),
    bpm: form.get('bpm'),
    duration: form.get('duration'),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Metadados inválidos.', details: parsed.error.flatten() }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!looksLikeMp3(bytes)) {
    return NextResponse.json({ error: 'O conteúdo do arquivo não parece ser um MP3 válido.' }, { status: 400 });
  }

  // Nome final é sempre gerado pelo servidor — nunca usa file.name do cliente,
  // isso por si só já elimina qualquer risco de path traversal via nome de arquivo.
  const safeName = `${slugify(parsed.data.title)}-${crypto.randomBytes(4).toString('hex')}.mp3`;
  const destPath = path.resolve(MEDIA_DIR, safeName);
  if (!destPath.startsWith(MEDIA_DIR + path.sep)) {
    return NextResponse.json({ error: 'Nome de arquivo inválido.' }, { status: 400 });
  }

  try {
    // flag 'wx': falha em vez de sobrescrever se o nome (aleatório) já existir.
    await fs.writeFile(destPath, bytes, { flag: 'wx' });
  } catch {
    return NextResponse.json({ error: 'Não foi possível salvar o arquivo. Tente novamente.' }, { status: 500 });
  }

  const src = `/media/${safeName}`;
  try {
    const insert = db.prepare(
      'INSERT INTO tracks (title, src, category, bpm, duration) VALUES (?, ?, ?, ?, ?)'
    );
    const result = insert.run(
      parsed.data.title,
      src,
      parsed.data.category,
      parsed.data.bpm ?? null,
      parsed.data.duration || null
    );
    const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json({ track }, { status: 201 });
  } catch (err) {
    // Banco falhou depois do arquivo já gravado — remove o órfão para não
    // vazar disco em cada tentativa que falhar nesse ponto.
    await fs.unlink(destPath).catch(() => {});
    console.error('Falha ao inserir track após upload:', err);
    return NextResponse.json({ error: 'Falha ao salvar no banco de dados.' }, { status: 500 });
  }
}
