'use client';

import { useRef, useState } from 'react';
import { CATEGORIES, type Category, type Track } from '@/lib/types';

export default function UploadPanel({ onUploaded }: { onUploaded: (track: Track) => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [category, setCategory] = useState<Category>('house');
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      setError('Selecione um arquivo .mp3 ou .wav.');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const track = await uploadWithProgress('/api/upload', formData, setProgress);
      onUploaded(track);
      form.reset();
      setFileName(null);
      setCategory('house');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no upload.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  return (
    <section className="rounded-2xl border border-bg3 bg-bg1 p-6">
      <h2 className="font-display text-lg font-bold text-fg">
        Novo <span className="text-accent">upload</span>
      </h2>

      <form ref={formRef} onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="title" className="mb-1.5 block font-mono text-[.68rem] uppercase tracking-wider text-fg-3">
            Título
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={200}
            placeholder="#129 #HouseSuave #Lounge (FlasHouse)"
            className="w-full rounded-lg border border-bg3 bg-bg2 px-3.5 py-2.5 text-sm text-fg outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="category" className="mb-1.5 block font-mono text-[.68rem] uppercase tracking-wider text-fg-3">
            Categoria
          </label>
          <select
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full rounded-lg border border-bg3 bg-bg2 px-3.5 py-2.5 text-sm text-fg outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="file" className="mb-1.5 block font-mono text-[.68rem] uppercase tracking-wider text-fg-3">
            Arquivo de áudio
          </label>
          <label
            htmlFor="file"
            className="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-bg3 bg-bg2 px-3.5 py-3 text-sm text-fg-3 transition hover:border-accent hover:text-fg"
          >
            <span className="truncate">{fileName || 'Escolher arquivo .mp3 ou .wav…'}</span>
            <span className="ml-3 shrink-0 font-mono text-[.68rem] uppercase tracking-wider text-accent">Selecionar</span>
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept="audio/mpeg,.mp3,audio/wav,audio/x-wav,.wav"
            required
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </div>

        {error && (
          <p role="alert" className="sm:col-span-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
            {error}
          </p>
        )}

        {uploading && (
          <div className="sm:col-span-2 h-1.5 overflow-hidden rounded-full bg-bg2">
            <div
              className="h-full rounded-full bg-accent shadow-glow-sm transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={uploading}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-glow-sm transition hover:bg-accent-press disabled:opacity-50"
          >
            {uploading ? `Enviando… ${progress}%` : 'Enviar set'}
          </button>
        </div>
      </form>
    </section>
  );
}

function uploadWithProgress(url: string, formData: FormData, onProgress: (pct: number) => void): Promise<Track> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      let data: { track?: Track; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // resposta não-JSON tratada abaixo pelo status
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.track) {
        resolve(data.track);
      } else {
        reject(new Error(data.error || `Falha no upload (HTTP ${xhr.status}).`));
      }
    };

    xhr.onerror = () => reject(new Error('Erro de rede durante o upload.'));
    xhr.send(formData);
  });
}
