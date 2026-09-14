'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { BASE_PATH } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    const response = await fetch(`${BASE_PATH}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: data.get('username'), password: data.get('password') }),
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setError(result.error || 'Não foi possível entrar.');
    router.push('/admin'); router.refresh();
  }

  return <main className="login-page">
    <section className="login-card">
      <a href="https://rogeriomessdj.com.br" aria-label="Site Rogério Mess"><Image src={`${BASE_PATH}/assets/logo-mess-white.png`} width={400} height={72} alt="DJ Rogério Mess" priority /></a>
      <p className="kicker">Área restrita</p>
      <h1>Gestão dos <em>packs.</em></h1>
      <p className="muted">Cadastre packs, confira comprovantes e libere os downloads.</p>
      <form onSubmit={submit} className="stack-form">
        <label>Usuário<input name="username" required autoComplete="username" /></label>
        <label>Senha<input name="password" type="password" required autoComplete="current-password" /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Entrando…' : 'Entrar no painel'}</button>
      </form>
      <a className="text-link" href={`${BASE_PATH}/`}>← Voltar para a loja</a>
    </section>
  </main>;
}
