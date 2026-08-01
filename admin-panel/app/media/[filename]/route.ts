import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { NextRequest, NextResponse } from 'next/server';
import { MEDIA_DIR } from '@/lib/paths';

export const runtime = 'nodejs';
// Nunca cachear/prerenderizar como rota estática: o arquivo é lido do disco
// a cada request de propósito, porque uploads acontecem em runtime (é
// exatamente o problema que essa rota substitui — servir via public/
// estático não pega arquivo gravado depois do build/boot do Next).
export const dynamic = 'force-dynamic';

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const ext = filename ? path.extname(filename).toLowerCase() : '';
  const contentType = CONTENT_TYPE_BY_EXT[ext];

  if (!filename || !contentType) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  }

  // `filename` nunca tem "/" (upload sempre gera nome plano via slugify),
  // mas resolve+verifica mesmo assim — defesa em profundidade contra
  // path traversal caso esse valor um dia venha de outro lugar.
  const resolved = path.resolve(MEDIA_DIR, filename);
  if (resolved !== MEDIA_DIR && !resolved.startsWith(MEDIA_DIR + path.sep)) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  }

  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(resolved);
  } catch {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  }
  if (!stat.isFile()) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  }

  const baseHeaders = {
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    // Nome final inclui um sufixo aleatório (colisão-livre) — pode cachear
    // "para sempre" no navegador/CDN sem risco de servir conteúdo trocado.
    'Cache-Control': 'public, max-age=31536000, immutable',
  } as const;

  // Suporte a Range é o que permite o player pular para o meio de um set de
  // 100–170MB sem baixar o arquivo inteiro antes.
  const range = req.headers.get('range');
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) {
      return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${stat.size}` } });
    }

    let start: number;
    let end: number;
    if (match[1] === '') {
      // "bytes=-500" -> últimos 500 bytes
      const suffixLength = parseInt(match[2], 10);
      start = Math.max(stat.size - suffixLength, 0);
      end = stat.size - 1;
    } else {
      start = parseInt(match[1], 10);
      end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
    }

    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= stat.size) {
      return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${stat.size}` } });
    }
    end = Math.min(end, stat.size - 1);

    const nodeStream = fs.createReadStream(resolved, { start, end });
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new NextResponse(webStream, {
      status: 206,
      headers: {
        ...baseHeaders,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Content-Length': String(end - start + 1),
      },
    });
  }

  const nodeStream = fs.createReadStream(resolved);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      ...baseHeaders,
      'Content-Length': String(stat.size),
    },
  });
}
