import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Packs de Música · DJ Rogério Mess',
  description: 'Packs selecionados pelo DJ Rogério Mess. Pagamento por PIX e download protegido.',
  icons: { icon: '/packs/favicon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR" className={`${sans.variable} ${display.variable} ${mono.variable}`}><body>{children}</body></html>;
}
