import LogoutButton from '@/components/LogoutButton';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col justify-between">
      <div>
        <header className="sticky top-0 z-10 border-b border-bg3 bg-bg0/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <img src="/logo-mess.png" alt="DJ Rogério Mess" className="h-5 w-auto" />
              <span className="h-2 w-2 rounded-full bg-accent shadow-glow-sm" />
              <span className="font-mono text-[.68rem] uppercase tracking-[.28em] text-fg-3">
                Painel
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <a
                href="https://rogeriomessdj.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-bg3 px-3.5 py-1.5 font-mono text-[.7rem] uppercase tracking-wider text-fg-2 transition hover:border-accent hover:text-accent"
              >
                <span>Ver Site</span>
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <LogoutButton />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      </div>
      <footer className="border-t border-bg3 py-6 mt-12 bg-bg1/50">
        <div className="mx-auto max-w-6xl px-6 text-center font-mono text-xs text-fg-3">
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
      </footer>
    </div>
  );
}
