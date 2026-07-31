import fs from 'node:fs';
import path from 'node:path';

// Resolvidos uma vez, na raiz do projeto — a mesma pasta que precisa
// persistir entre deploys na VPS/cPanel (não é serverless: o disco é real e dura).
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), 'data');

export const MEDIA_DIR = process.env.MEDIA_DIR
  ? path.resolve(process.env.MEDIA_DIR)
  : path.join(process.cwd(), 'public', 'media');

for (const dir of [DATA_DIR, MEDIA_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
