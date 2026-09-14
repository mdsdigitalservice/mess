import crypto from 'node:crypto';

const OPTIONS = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;

export function verifyPassword(password: string, encoded: string) {
  const [method, saltHex, hashHex] = encoded.split('.');
  if (method !== 'scrypt' || !saltHex || !hashHex) return false;
  try {
    const expected = Buffer.from(hashHex, 'hex');
    if (expected.length !== KEY_LENGTH) return false;
    const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), KEY_LENGTH, OPTIONS);
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function verifyPlainPassword(password: string, expected: string) {
  const actualHash = crypto.createHash('sha256').update(password, 'utf8').digest();
  const expectedHash = crypto.createHash('sha256').update(expected, 'utf8').digest();
  return crypto.timingSafeEqual(actualHash, expectedHash);
}
