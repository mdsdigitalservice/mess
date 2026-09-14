import { NextResponse } from 'next/server';
import { z } from 'zod';
import { allowAction, ensureSchema, sql } from '@/lib/db';
import { signedUpload } from '@/lib/r2';
import { BASE_PATH, randomId, storeUrl, uniqueObjectKey } from '@/lib/store';
import type { Pack } from '@/lib/types';

const Schema = z.object({
  pack_id: z.string().regex(/^[a-f0-9]{24}$/),
  customer_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  whatsapp: z.string().transform((value) => value.replace(/\D/g, '')).refine((value) => value.length >= 10 && value.length <= 13),
  proof_filename: z.string().trim().min(1).max(255),
  proof_type: z.enum(['image/jpeg', 'image/png', 'application/pdf']),
  proof_size: z.number().int().positive().max(10 * 1024 * 1024),
});

function proofExtension(type: string) {
  return type === 'application/pdf' ? 'pdf' : type === 'image/png' ? 'png' : 'jpg';
}

export async function POST(request: Request) {
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Confira os dados e o comprovante.' }, { status: 400 });
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    if (!await allowAction(`order:${ip}`, 8, 60)) return NextResponse.json({ error: 'Muitos pedidos enviados. Tente novamente mais tarde.' }, { status: 429 });
    const db = sql();
    const [pack] = await db`SELECT * FROM packs WHERE id=${parsed.data.pack_id} AND active=TRUE AND bundle_key IS NOT NULL` as unknown as Pack[];
    if (!pack) return NextResponse.json({ error: 'Pack indisponível.' }, { status: 404 });
    const id = randomId(12); const token = randomId(24);
    const proofKey = uniqueObjectKey(`proofs/${id}`, 'comprovante', proofExtension(parsed.data.proof_type));
    const uploadUrl = await signedUpload(proofKey, parsed.data.proof_type);
    await db`INSERT INTO pack_orders (id, public_token, pack_id, customer_name, email, whatsapp, proof_key)
      VALUES (${id}, ${token}, ${pack.id}, ${parsed.data.customer_name}, ${parsed.data.email}, ${parsed.data.whatsapp}, ${proofKey})`;
    return NextResponse.json({
      token, upload_url: uploadUrl, headers: { 'Content-Type': parsed.data.proof_type },
      complete_url: `${BASE_PATH}/api/orders/${token}`, status_url: storeUrl(token),
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Loja ainda não configurada para receber pedidos.' }, { status: 503 });
  }
}
