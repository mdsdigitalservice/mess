// Gera o hash de senha do único usuário admin, para colar no .env.
// Uso: npm run create-admin -- <usuario> <senha>
import crypto from 'node:crypto';

const [, , username, password] = process.argv;

if (!username || !password) {
  console.error('Uso: npm run create-admin -- <usuario> <senha>');
  process.exit(1);
}
if (password.length < 10) {
  console.error('Escolha uma senha com pelo menos 10 caracteres.');
  process.exit(1);
}

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;

// Separador "." (não "$"): o Next.js expande "$VAR" ao ler .env, o que
// corrompe silenciosamente um hash que contenha "$". Ver lib/password.ts.
const salt = crypto.randomBytes(16);
const hash = crypto.scryptSync(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
const encoded = ['scrypt', salt.toString('hex'), hash.toString('hex')].join('.');

console.log('\nAdicione (ou substitua) estas linhas no seu .env:\n');
console.log(`ADMIN_USERNAME=${username}`);
console.log(`ADMIN_PASSWORD_HASH=${encoded}`);
console.log('');
