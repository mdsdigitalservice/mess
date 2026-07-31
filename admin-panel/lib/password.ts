import crypto from 'node:crypto';

// scrypt via node:crypto em vez de argon2/bcrypt: zero dependência nativa extra
// para compilar no deploy (a VPS cPanel não garante toolchain de build — é o
// mesmo motivo pelo qual o banco usa node:sqlite em vez de better-sqlite3).
// scrypt é memory-hard e é o KDF recomendado quando não se quer trazer uma
// lib externa de hashing de senha.
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;

// Separador "." em vez de "$": o Next.js expande "$VAR" ao carregar .env
// (mesmo comportamento do dotenv-expand), então um hash com "$" no meio
// era silenciosamente truncado/corrompido ao ser lido do .env em produção.
const SEPARATOR = '.';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return ['scrypt', salt.toString('hex'), hash.toString('hex')].join(SEPARATOR);
}

export function verifyPassword(password: string, encoded: string): boolean {
  const parts = encoded.split(SEPARATOR);
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, saltHex, hashHex] = parts;

  let salt: Buffer, expected: Buffer;
  try {
    salt = Buffer.from(saltHex, 'hex');
    expected = Buffer.from(hashHex, 'hex');
  } catch {
    return false;
  }
  if (expected.length !== KEY_LEN) return false;

  const actual = crypto.scryptSync(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return crypto.timingSafeEqual(actual, expected);
}
