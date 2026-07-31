// Tipos compartilhados entre client e server components.
// Fica separado de lib/db.ts de propósito: lib/db.ts importa better-sqlite3
// (módulo nativo), e nenhum arquivo client component pode importar isso
// direta ou indiretamente sem quebrar o bundle do navegador.
export type Track = {
  id: number;
  title: string;
  src: string;
  category: string;
  bpm: number | null;
  duration: string | null;
  created_at: string;
};

export const CATEGORIES = [
  { value: 'house', label: 'House' },
  { value: 'flashback', label: 'FlashBack' },
  { value: 'sertanejo', label: 'Sertanejo / Pagode' },
] as const;

export type Category = (typeof CATEGORIES)[number]['value'];
