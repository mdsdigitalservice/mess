'use client';

import { useMemo, useRef, useState } from 'react';
import { CATEGORIES, type Track } from '@/lib/types';

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label])) as Record<string, string>;

export default function TracksTable({
  tracks,
  onDeleted,
  onUpdated,
}: {
  tracks: Track[];
  onDeleted: (id: number) => void;
  onUpdated: (track: Track) => void;
}) {
  const [filter, setFilter] = useState<'all' | string>('all');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filtered = useMemo(
    () => (filter === 'all' ? tracks : tracks.filter((t) => t.category === filter)),
    [tracks, filter]
  );

  async function togglePlay(track: Track) {
    const audio = audioRef.current;
    if (!audio || !track.src) return;

    if (playingId === track.id) {
      audio.pause();
      setPlayingId(null);
      return;
    }

    audio.src = track.src;
    setPlayingId(track.id);
    try {
      await audio.play();
    } catch {
      setPlayingId(null);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Apagar essa faixa? O arquivo MP3 também será removido do servidor.')) return;
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
    }
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/tracks/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Falha ao apagar.');
      }
      onDeleted(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao apagar.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveEdit(id: number, patch: Partial<Track>) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/tracks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar.');
      onUpdated(data.track);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-bg3 bg-bg1 p-6">
      {/* elemento único compartilhado — só uma faixa toca por vez no painel.
          Só escuta "ended": trocar de faixa dispara "pause" implícito no áudio
          anterior de forma assíncrona, e isso corrida com o setPlayingId da
          faixa nova se também reagisse a "pause" aqui. */}
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-lg font-bold text-fg">
          Catálogo <span className="text-fg-3">· {filtered.length} faixa{filtered.length === 1 ? '' : 's'}</span>
        </h2>

        <div className="flex flex-wrap gap-2">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            Todas
          </FilterChip>
          {CATEGORIES.map((c) => (
            <FilterChip key={c.value} active={filter === c.value} onClick={() => setFilter(c.value)}>
              {c.label}
            </FilterChip>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-bg3 text-left font-mono text-[.65rem] uppercase tracking-wider text-fg-3">
              <th className="py-2 pr-3 font-medium">Título</th>
              <th className="py-2 pr-3 font-medium">Categoria</th>
              <th className="py-2 pr-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-fg-3">
                  Nenhuma faixa nessa categoria ainda.
                </td>
              </tr>
            )}
            {filtered.map((t) =>
              editingId === t.id ? (
                <EditRow
                  key={t.id}
                  track={t}
                  busy={busyId === t.id}
                  onCancel={() => setEditingId(null)}
                  onSave={(patch) => handleSaveEdit(t.id, patch)}
                />
              ) : (
                <tr key={t.id} className="border-b border-bg2 align-middle transition hover:bg-bg2/60">
                  <td className="max-w-[280px] py-3 pr-3" title={t.title}>
                    <div className="flex items-center gap-2.5">
                      {playingId === t.id && (
                        <div className="flex h-3.5 items-end gap-[2px] shrink-0" aria-hidden="true" title="Tocando agora">
                          <span className="eq-bar" />
                          <span className="eq-bar" />
                          <span className="eq-bar" />
                          <span className="eq-bar" />
                          <span className="eq-bar" />
                        </div>
                      )}
                      <span className={`truncate ${playingId === t.id ? 'font-semibold text-accent' : 'text-fg'}`}>
                        {t.title}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <span className="rounded-full border border-bg3 px-2.5 py-0.5 font-mono text-[.65rem] uppercase tracking-wider text-fg-2">
                      {CATEGORY_LABEL[t.category] ?? t.category}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex justify-end items-center gap-2">
                      <button
                        onClick={() => togglePlay(t)}
                        disabled={!t.src}
                        title={t.src ? (playingId === t.id ? 'Pausar' : 'Ouvir') : 'Sem áudio'}
                        className={`flex h-7 w-7 items-center justify-center rounded-md border transition disabled:opacity-25 disabled:pointer-events-none ${
                          playingId === t.id
                            ? 'border-accent bg-accent text-white shadow-glow-sm hover:bg-accent-press'
                            : 'border-bg3 text-fg-2 hover:border-accent hover:text-accent'
                        }`}
                      >
                        {playingId === t.id ? <PauseIcon /> : <PlayIcon />}
                      </button>
                      <a
                        href={t.src || undefined}
                        download={t.src ? `${t.title}.mp3` : undefined}
                        aria-disabled={!t.src}
                        title={t.src ? 'Baixar MP3' : 'Sem áudio'}
                        onClick={(e) => {
                          if (!t.src) e.preventDefault();
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-bg3 text-fg-2 transition hover:border-accent hover:text-accent aria-disabled:opacity-25 aria-disabled:pointer-events-none"
                      >
                        <DownloadIcon />
                      </a>
                      <button
                        onClick={() => setEditingId(t.id)}
                        disabled={busyId === t.id}
                        className="rounded-md border border-bg3 px-2.5 py-1 text-xs text-fg-2 transition hover:border-accent hover:text-accent disabled:opacity-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={busyId === t.id}
                        className="rounded-md border border-bg3 px-2.5 py-1 text-xs text-fg-2 transition hover:border-accent hover:text-accent disabled:opacity-50"
                      >
                        {busyId === t.id ? '…' : 'Apagar'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 font-mono text-[.68rem] uppercase tracking-wider transition ${
        active ? 'border-accent bg-accent/10 text-accent' : 'border-bg3 text-fg-3 hover:border-fg-3 hover:text-fg-2'
      }`}
    >
      {children}
    </button>
  );
}

function EditRow({
  track,
  busy,
  onCancel,
  onSave,
}: {
  track: Track;
  busy: boolean;
  onCancel: () => void;
  onSave: (patch: Partial<Track>) => void;
}) {
  const [title, setTitle] = useState(track.title);
  const [category, setCategory] = useState(track.category);

  return (
    <tr className="border-b border-bg2 bg-bg2/40">
      <td className="py-2.5 pr-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-bg3 bg-bg2 px-2 py-1.5 text-sm text-fg outline-none focus:border-accent"
        />
      </td>
      <td className="py-2.5 pr-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-md border border-bg3 bg-bg2 px-2 py-1.5 text-sm text-fg outline-none focus:border-accent"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2.5 pr-3">
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-md border border-bg3 px-2.5 py-1 text-xs text-fg-2 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() =>
              onSave({
                title: title.trim(),
                category,
              })
            }
            disabled={busy || !title.trim()}
            className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
          >
            {busy ? '…' : 'Salvar'}
          </button>
        </div>
      </td>
    </tr>
  );
}

function PlayIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
      <path d="M2 1.2v9.6c0 .6.7 1 1.2.6l7.3-4.8c.5-.3.5-1 0-1.3L3.2.6C2.7.2 2 .6 2 1.2Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
      <rect x="2" y="1" width="3" height="10" rx="0.5" />
      <rect x="7" y="1" width="3" height="10" rx="0.5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5v8.5" />
      <path d="M4.5 6.5 8 10l3.5-3.5" />
      <path d="M2 12v1.5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V12" />
    </svg>
  );
}
