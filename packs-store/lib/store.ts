import crypto from 'node:crypto';

export const BASE_PATH = '/packs';

export function slugify(input: string) {
  return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'pack';
}

export function randomId(bytes = 16) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function uniqueObjectKey(prefix: string, label: string, extension: string) {
  return `${prefix}/${slugify(label)}-${randomId(6)}.${extension}`;
}

export function storeUrl(token?: string) {
  const base = process.env.STORE_PUBLIC_URL || 'https://rogeriomessdj.com.br/packs/';
  if (!token) return base;
  const url = new URL(base);
  url.searchParams.set('pedido', token);
  return url.toString();
}
