import AdminDashboard from '@/components/AdminDashboard';
import db from '@/lib/db';
import type { Track } from '@/lib/types';

// Nunca pré-renderizar estático: é dado que muda a cada upload/edição, e a
// rota já está atrás de auth — cache estático não faz sentido aqui.
export const dynamic = 'force-dynamic';

export default function AdminPage() {
  const rows = db.prepare('SELECT * FROM tracks ORDER BY id DESC LIMIT 100').all() as Track[];
  // node:sqlite retorna linhas com prototype null — React Server Components só
  // aceita objeto plano como prop pra Client Component, então precisa "replanar".
  const tracks = rows.map((t) => ({ ...t }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-fg">
          Sets <span className="text-accent">·</span> catálogo
        </h1>
        <p className="mt-1 text-sm text-fg-3">Envie novos MP3s e gerencie os metadados dos sets do player.</p>
      </div>
      <AdminDashboard initialTracks={tracks} />
    </div>
  );
}
