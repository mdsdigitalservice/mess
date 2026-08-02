import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Track } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Textos fixos por categoria — mesmo conteúdo que já existia em rogerio-mess-dj/data/sets.json,
// pra manter a aparência do site idêntica (só a fonte dos dados muda).
const SECTION_META: Record<string, { label: string; short: string; symbol: string; blurb: string }> = {
  house: {
    label: 'House',
    short: 'House',
    symbol: 'HO',
    blurb: 'Do comercial ao melodic techno — a espinha dorsal dos sets de pista.',
  },
  flashback: {
    label: "FlashBack's",
    short: 'FlashBack',
    symbol: 'FB',
    blurb: 'Dos anos 80 aos 2010 — pop, rock, tribal e dance que enchem a pista de nostalgia.',
  },
  sertanejo: {
    label: 'Sertanejo / Lambadão',
    short: 'Sertanejo/Lambadão',
    symbol: 'SE',
    blurb: 'Modão, lambadão e sertanejo — do raiz ao pisadinha, ao vivo e mixado.',
  },
};
const CATEGORY_ORDER = ['house', 'flashback', 'sertanejo'];

// O player do site usa a primeira #tag não-numérica do título como "chip"
// (ver chipFor em index.html) — extrai isso do título já que o painel não
// guarda tags como campo próprio.
function extractTags(title: string): string[] {
  const matches = title.match(/#(\S+)/g) || [];
  return matches.map((t) => t.slice(1).replace(/[^\w].*$/, '')).filter(Boolean);
}

// Rota pública (sem sessão — não está sob /api/tracks nem /api/upload, então
// o middleware não bloqueia) e com CORS liberado: o site principal
// (rogeriomessdj.com.br) busca isso de outro subdomínio (painel.*).
export async function GET() {
  // DESC: upload mais recente aparece primeiro em cada seção do player.
  const rows = db.prepare('SELECT * FROM tracks ORDER BY id DESC').all() as Track[];

  const byCategory = new Map<string, Track[]>();
  for (const row of rows) {
    const list = byCategory.get(row.category) ?? [];
    list.push(row);
    byCategory.set(row.category, list);
  }

  const sections = CATEGORY_ORDER.filter((cat) => byCategory.has(cat)).map((cat) => {
    const tracks = byCategory.get(cat)!;
    const meta = SECTION_META[cat] ?? { label: cat, short: cat, symbol: cat.slice(0, 2).toUpperCase(), blurb: '' };
    return {
      id: cat,
      label: meta.label,
      short: meta.short,
      symbol: meta.symbol,
      blurb: meta.blurb,
      count: tracks.length,
      tracks: tracks.map((t) => ({
        title: t.title,
        tags: extractTags(t.title),
        bpm: t.bpm,
        dur: t.duration || '',
        // Uploads feitos pelo painel salvam caminho relativo (/media/arquivo.mp3),
        // servido pela própria rota /media do painel — precisa virar URL absoluta
        // pro site público (outro domínio) não tentar resolver contra o próprio host.
        src: t.src?.startsWith('/media/') ? `https://painel.rogeriomessdj.com.br${t.src}` : t.src,
      })),
    };
  });

  return NextResponse.json(
    { artist: 'Rogério Mess', sections },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    }
  );
}
