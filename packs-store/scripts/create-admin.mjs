import crypto from 'node:crypto';

const [, , username, password, roleArg] = process.argv;
if (!username || !password || password.length < 10) {
  console.error('Uso: npm run create-admin -- <usuario> <senha-com-10-caracteres> [admin|packs]');
  process.exit(1);
}
const salt = crypto.randomBytes(16);
const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
const prefix = roleArg === 'packs' ? 'PACKS' : 'ADMIN';
console.log(`${prefix}_USERNAME=${username}`);
console.log(`${prefix}_PASSWORD_HASH=${['scrypt', salt.toString('hex'), hash.toString('hex')].join('.')}`);
