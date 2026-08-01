import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

// Os sets ao vivo já migrados chegam a ~170MB (ver histórico de migração do WordPress).
const MAX_FILE_BYTES = 250 * 1024 * 1024;
const ALLOWED_EXT = ['mp3', 'wav'] as const;

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

// Nunca confiar na extensão/nome enviado pelo cliente para decidir o tipo —
// checa os bytes reais do arquivo (mesma checagem replicada no upload.php,
// já que ele também recebe uploads diretamente em testes manuais).
function looksLikeAudio(buf: Buffer, ext: string): boolean {
  if (buf.length < 12) return false;
  if (ext === 'mp3') {
    if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return true; // "ID3"
    return buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0; // frame sync MPEG
  }
  if (ext === 'wav') {
    return buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE';
  }
  return false;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`upload:${ip}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Limite de uploads por hora atingido.' }, { status: 429 });
  }

  const bridgeUrl = process.env.UPLOAD_BRIDGE_URL;
  const bridgeToken = process.env.UPLOAD_BRIDGE_TOKEN;
  if (!bridgeUrl || !bridgeToken) {
    console.error('UPLOAD_BRIDGE_URL / UPLOAD_BRIDGE_TOKEN não configurados.');
    return NextResponse.json({ error: 'Upload não configurado no servidor.' }, { status: 500 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Formulário inválido.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Arquivo de áudio ausente.' }, { status: 400 });
  }

  if (file.size === 0 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `O arquivo deve ter entre 1 byte e ${Math.floor(MAX_FILE_BYTES / 1024 / 1024)}MB.` },
      { status: 400 }
    );
  }

  const clientExt = path.extname(file.name).toLowerCase().replace('.', '');
  if (!ALLOWED_EXT.includes(clientExt as (typeof ALLOWED_EXT)[number])) {
    return NextResponse.json({ error: 'Somente arquivos .mp3 ou .wav são aceitos.' }, { status: 400 });
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
  if (!looksLikeAudio(bytes, clientExt)) {
    return NextResponse.json(
      { error: `O conteúdo do arquivo não parece ser um áudio ${clientExt.toUpperCase()} válido.` },
      { status: 400 }
    );
  }

  // Encaminha servidor-a-servidor pro bridge PHP no cPanel — ele que grava o
  // arquivo fisicamente em public_html/media/ e devolve a URL pública final.
  // O token nunca é exposto ao navegador (só existe aqui, nas env vars do
  // servidor Next.js) e no upload-secret.php do lado do cPanel.
  const bridgeForm = new FormData();
  bridgeForm.append('title', parsed.data.title);
  bridgeForm.append('file', file, file.name);

  let bridgeJson: { ok?: boolean; url?: string; error?: string };
  try {
    const bridgeRes = await fetch(bridgeUrl, {
      method: 'POST',
      headers: { 'X-Upload-Token': bridgeToken },
      body: bridgeForm,
    });
    bridgeJson = await bridgeRes.json().catch(() => ({}));
    if (!bridgeRes.ok || !bridgeJson.ok || !bridgeJson.url) {
      return NextResponse.json(
        { error: bridgeJson.error || 'Falha ao salvar o arquivo no servidor de mídia.' },
        { status: 502 }
      );
    }
  } catch (err) {
    console.error('Falha ao contatar o bridge de upload:', err);
    return NextResponse.json({ error: 'Não foi possível contatar o servidor de mídia.' }, { status: 502 });
  }

  const db = await getDb();
  const result = await db.execute({
    sql: 'INSERT INTO tracks (title, src, category, bpm, duration) VALUES (?, ?, ?, ?, ?)',
    args: [
      parsed.data.title,
      bridgeJson.url,
      parsed.data.category,
      parsed.data.bpm ?? null,
      parsed.data.duration || null,
    ],
  });

  const trackId = Number(result.lastInsertRowid);
  const select = await db.execute({ sql: 'SELECT * FROM tracks WHERE id = ?', args: [trackId] });

  return NextResponse.json({ track: select.rows[0] }, { status: 201 });
}
