'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

// Alturas/tempos fixos (não Math.random()) — geram um espectro com variação
// orgânica sem arriscar mismatch de hidratação entre servidor e cliente.
const HERO_BARS = [
  32, 58, 41, 76, 50, 88, 35, 63, 100, 47, 71, 30, 84, 55, 40, 92, 62, 38, 78,
  46, 66, 33, 95, 52,
].map((h, i) => ({ h, duration: 0.55 + ((i * 7) % 9) / 10, delay: ((i * 3) % 7) / 10 }));

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Falha ao entrar.');
        return;
      }
      router.push(searchParams.get('next') || '/admin');
      router.refresh();
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-bg0 lg:grid lg:grid-cols-[1.15fr_1fr]">
      {/* Painel visual — só em telas largas, puramente decorativo */}
      <div className="relative hidden overflow-hidden border-r border-bg3 bg-bg1 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[.35]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(244,244,245,.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(244,244,245,.06) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-accent/20 blur-[100px]"
        />

        <div className="relative flex items-center gap-2.5">
          <img src="/logo-mess.png" alt="DJ Rogério Mess" className="h-6 w-auto" />
          <span className="h-2 w-2 rounded-full bg-accent shadow-glow-sm" />
          <span className="font-mono text-[.68rem] uppercase tracking-[.28em] text-fg-3">Painel Administrativo</span>
        </div>

        <div className="relative">
          <p className="max-w-sm font-display text-3xl font-bold leading-[1.15] text-fg">
            Gestão dos sets <span className="text-accent">·</span> House, FlashBack e Sertanejo/Pagode.
          </p>
          <p className="mt-3 max-w-xs text-sm text-fg-3">
            Upload, catálogo e entrega dos MP3 que alimentam o player do site.
          </p>

          <div className="mt-10 flex h-24 items-end gap-[3px]" aria-hidden="true">
            {HERO_BARS.map((bar, i) => (
              <span
                key={i}
                className="w-[3px] shrink-0 rounded-full bg-accent/70"
                style={{
                  height: `${bar.h}%`,
                  animation: `eq-bar ${bar.duration}s ease-in-out ${bar.delay}s infinite alternate`,
                  boxShadow: '0 0 6px rgba(227,31,37,.35)',
                }}
              />
            ))}
          </div>
        </div>

        <div className="relative font-mono text-[.68rem] uppercase tracking-wider text-fg-3">
          Painel Control V.01 <span className="text-accent">·</span> MDS Digital
        </div>
      </div>

      {/* Painel de login */}
      <div className="flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <img src="/logo-mess.png" alt="DJ Rogério Mess" className="h-5 w-auto" />
            <span className="h-2 w-2 rounded-full bg-accent shadow-glow-sm" />
            <span className="font-mono text-[.68rem] uppercase tracking-[.28em] text-fg-3">
              Painel
            </span>
          </div>

          <h1 className="font-display text-2xl font-bold leading-tight text-fg">
            Acesso <span className="text-accent">restrito</span>
          </h1>
          <p className="mt-2 text-sm text-fg-3">Entre com suas credenciais de administrador.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="username" className="mb-1.5 block font-mono text-[.68rem] uppercase tracking-wider text-fg-3">
                Usuário
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-bg3 bg-bg2 px-3.5 py-2.5 text-sm text-fg outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block font-mono text-[.68rem] uppercase tracking-wider text-fg-3">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-bg3 bg-bg2 px-3.5 py-2.5 text-sm text-fg outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-glow-sm transition hover:bg-accent-press disabled:opacity-50"
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <div className="mt-8 text-center font-mono text-[.7rem] text-fg-3 lg:hidden">
            Painel Control V.01 <span className="text-accent">·</span> Powered By{' '}
            <a
              href="https://api.whatsapp.com/send?phone=5565996226120&text=Ol%C3%A1!%20Vim%20pelo%20Painel%20do%20Rog%C3%A9rio%20Mess."
              target="_blank"
              rel="noopener noreferrer"
              className="text-fg font-medium hover:text-accent underline decoration-bg3 transition"
            >
              MDS Digital
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
