'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="rounded-lg border border-bg3 px-3.5 py-1.5 font-mono text-[.7rem] uppercase tracking-wider text-fg-2 transition hover:border-accent hover:text-accent disabled:opacity-50"
    >
      {loading ? 'Saindo…' : 'Sair'}
    </button>
  );
}
